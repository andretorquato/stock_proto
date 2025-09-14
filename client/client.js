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

var target = "127.0.0.1:50051";
var client = new stock_proto.StockPrice(
  target,
  grpc.credentials.createInsecure()
);
var deadline = new Date();
deadline.setSeconds(deadline.getSeconds() + 40);

function clientStreaming() {
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

function unary() {
  var request = { symbol: "ABC" };
  client.GetStockPrice(request, { deadline }, function (err, response) {
    console.log(`Stock>`, response);
  });
}

function serverStreaming() {
  var request = { symbol: "ABC" };
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

function bidirectionalStreaming() {
  var call = client.getStockPriceBidirectionalStreaming();

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

  var rl = readline.createInterface({
    input: process.stdin,
    prompt: "add stock or exit: ",
    output: process.stdout,
  });

  rl.on("line", function (line) {
    console.log(`Update Stock>`, line);

    if (line === "exit") {
      rl.close();
      return;
    }

    var stock = JSON.parse(line);
    call.write(stock);
  });

  rl.on("close", function () {
    call.end();
  });
}

// clientStreaming();
// unary();
// serverStreaming();
bidirectionalStreaming();
