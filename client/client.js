var PROTO_PATH = __dirname + "/protos/stock.proto";

var grpc = require("@grpc/grpc-js");
var protoLoader = require("@grpc/proto-loader");
var packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
var stock_proto = grpc.loadPackageDefinition(packageDefinition).stock_market;

function main() {
  var target = "127.0.0.1:50051";
  var client = new stock_proto.StockPrice(
    target,
    grpc.credentials.createInsecure()
  );
  
  var request = { symbol: "ABC" };
  var deadline = new Date();
  deadline.setSeconds(deadline.getSeconds() + 40);
  client.GetStockPrice(request, { deadline }, function (err, response) {
    console.log(`Stock>`, response);
  });

  var call = client.GetStockPriceServerStreaming(request, { deadline });

  call.on("data", function (response) {
    console.log(`Stock Stream>`, response);
  });

  call.on("error", function (err) {
    console.error(`Stock Stream> Error:`, err);
  });

  call.on("status", function (status) {
    console.log(`Stock Stream> Status:`, status);
  });

  call.on("end", function () {
    console.log(`Stock Stream> End`);
  });
}

main();
