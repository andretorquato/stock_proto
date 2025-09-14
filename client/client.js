var PROTO_PATH = __dirname + "/protos/stock.proto";

var grpc = require("@grpc/grpc-js");
var protoLoader = require("@grpc/proto-loader");
var readline = require("readline");
var fs = require("fs");

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

  // var request = { symbol: "ABC" };
  // var deadline = new Date();
  // deadline.setSeconds(deadline.getSeconds() + 40);
  // client.GetStockPrice(request, { deadline }, function (err, response) {
  //   console.log(`Stock>`, response);
  // });

  // var call = client.GetStockPriceServerStreaming(request, { deadline });

  // call.on("data", function (response) {
  //   console.log(`Stock Stream>`, response);
  // });

  // call.on("error", function (err) {
  //   console.error(`Stock Stream> Error:`, err);
  // });

  // call.on("status", function (status) {
  //   console.log(`Stock Stream> Status:`, status);
  // });

  // call.on("end", function () {
  //   console.log(`Stock Stream> End`);
  // });

  var call = client.updateStockPriceClientStreaming(function (err, response) {
    if (err) {
      console.error(`Update Stock> Error:`, err);
    } else {
      console.log(`Update Stock>`, response);
    }
  });

  var fileStream = fs.createReadStream(__dirname + "/data/stock.txt");
  var rl = readline.createInterface({ input: fileStream });
  rl.on("line", function (line) {
    console.log(`Update Stock>`, line);
    var stock = JSON.parse(line);
    call.write(stock);
  });

  rl.on("close", function () {
    console.log("Update Stock> All data sent.");
    call.end();
  });
}

main();
