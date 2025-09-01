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
  client.GetStockPrice({ symbol: "ABC" }, function (err, response) {
    console.log(`Stock>`, response);
  });
}

main();
