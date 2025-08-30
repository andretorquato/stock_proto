package main

import (
	"context"
	"log"
	"math/rand"
	"net"
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
		Symbol: req.GetSymbol(),
		Price:  price,
	}, nil
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
