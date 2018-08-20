const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const expressValidator = require('express-validator');

// Instantiate the app
const app = express();

// Setup static files
app.use(express.static(path.join(__dirname, 'public')));

// Make form submissions easier.
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Expose methods for validating user submitted data.
app.use(expressValidator());


// Export the app so it can be used.
module.exports = app;
