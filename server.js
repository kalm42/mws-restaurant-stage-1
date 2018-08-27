const express = require("express");
const path = require("path");
const compression = require("compression");

// Express app for serving our gulp'd files.
const app = express();

// Compress everything
app.use(compression());

// Hand over the static files
app.use(express.static(path.join(__dirname, "build")));

// Launch server
app.set("port", 8000);
const server = app.listen(app.get("port"), () => {
  console.log(`💻 Express running → PORT ${server.address().port}`);
});
