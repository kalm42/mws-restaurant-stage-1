// Import environmental variables
require('dotenv').config({ path: 'variables.env' });

// Instantiate the app
const app = require('./app');

app.set('port', process.env.PORT || 3001);
const server = app.listen(app.get('port'), () => {
  console.log(`💻 Express is 🏃‍♂️ on PORT ${server.address().port}`);
});
