const express = require("express");
const path = require("path");
const fs = require("fs");
const http2 = require("spdy");
const compression = require('compression');

// Express app for serving our gulp'd files.
const app = express();

app.use(express.static(path.join(__dirname, "build")));

app.use(compression())

app.get("/testing", function(req, res) {
  res.send("Hello World");
});

const options = {
  key: fs.readFileSync("./server.key"),
  cert: fs.readFileSync("./server.crt")
};

// http2.createServer(options, app).listen(8000, err => {
//   if (err) {
//     console.log(err);
//   }
//   console.log(`Listening on port 8000`);
  
// });

app.set("port", 8000);
const server = app.listen(app.get("port"), () => {
  console.log(`💻 Express running → PORT ${server.address().port}`);
});
