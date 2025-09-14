package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net"
	"os"
	"path/filepath"
	"time"

	"protoc_stock/proto"

	"google.golang.org/grpc"
)

type stockServer struct {
	proto.UnimplementedStockPriceServer
}

func (s *stockServer) GetStockPrice(ctx context.Context, req *proto.StockRequest) (*proto.StockResponse, error) {

	rand.Seed(time.Now().UnixNano())

	price := 10 + rand.Float64()*(500-10)

	return &proto.StockResponse{
		Symbol:    req.GetSymbol(),
		Price:     price,
		Timestamp: time.Now().Unix(),
	}, nil
}

func (s *stockServer) GetStockPriceServerStreaming(req *proto.StockRequest, stream grpc.ServerStreamingServer[proto.StockResponse]) error {
	const (
		maxIters   = 10
		delay      = 1500 * time.Millisecond
		minPrice   = 10.0
		maxPrice   = 500.0
		priceRange = maxPrice - minPrice
	)

	parentCtx := stream.Context()

	limitTime := time.Now().Add(30 * time.Second)
	ctx, cancel := context.WithDeadline(parentCtx, limitTime)
	defer cancel()

	for i := 0; i < maxIters; i++ {
		select {
		case <-ctx.Done():
			log.Println("Client cancelled the request")
			return ctx.Err()
		case <-time.After(delay):
		}

		price := minPrice + rand.Float64()*priceRange

		log.Printf("Sending price update %d: %f", i+1, price)
		resp := &proto.StockResponse{
			Symbol:    req.GetSymbol(),
			Price:     price,
			Timestamp: time.Now().Unix(),
		}

		if err := stream.Send(resp); err != nil {
			log.Printf("Error send stream: %v", err)
			return err
		}

	}

	return nil
}

func (s *stockServer) UpdateStockPriceClientStreaming(stream grpc.BidiStreamingServer[proto.UpdateStockPriceRequest, proto.UpdateStockPriceResponse]) error {
	const batchSize = 5

	parentCtx := stream.Context()

	filePath := "data/updates.jsonl"

	if err := os.MkdirAll(filepath.Dir(filePath), 0o755); err != nil {
		return fmt.Errorf("failed to create directory: %v", err)
	}

	f, err := os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)

	if err != nil {
		return fmt.Errorf("failed to open file: %v", err)
	}

	defer f.Close()

	enc := json.NewEncoder(f)

	batch := make([]*proto.UpdateStockPriceRequest, 0, batchSize)
	totalSaved := int64(0)

	flush := func() error {
		if len(batch) == 0 {
			return nil
		}

		for _, it := range batch {
			if err := enc.Encode(it); err != nil {
				return fmt.Errorf("failed to write JSONL: %v", err)
			}
			totalSaved++
		}

		ack := &proto.UpdateStockPriceResponse{
			Message: fmt.Sprintf("Saved %d updates, total %d", len(batch), totalSaved),
		}

		if err := stream.Send(ack); err != nil {
			return err
		}

		batch = batch[:0]
		return nil
	}

	for {
		select {
		case <-parentCtx.Done():
			return parentCtx.Err()
		default:
		}
		req, err := stream.Recv()

		if errors.Is(err, io.EOF) {
			if err := flush(); err != nil {
				return err
			}
			return nil
		}

		if err != nil {
			return err
		}

		batch = append(batch, req)

		if len(batch) >= batchSize {
			if err := flush(); err != nil {
				return err
			}
		}
	}
}

func main() {
	list, err := net.Listen("tcp", "127.0.0.1:50051")

	if err != nil {
		panic(err)
	}

	grpcServer := grpc.NewServer()

	proto.RegisterStockPriceServer(grpcServer, &stockServer{})

	log.Println("Server is running at 127.0.0.1:50051")

	if err := grpcServer.Serve(list); err != nil {
		log.Fatalf("Failed to serve: %v", err)
	}
}
