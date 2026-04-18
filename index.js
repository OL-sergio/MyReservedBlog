import express from 'express';
import bodyParser from 'body-parser';
import process from 'process';

const app = express();

// render.com provides the PORT and HOST environment variables,
//  so we need to use those instead of hardcoding them
const PORT = process.env.PORT || 10000;
const HOST = process.env.HOST || '0.0.0.0';

// For local development, you can uncomment the lines
// below and comment out the lines above
//const PORT = process.env.PORT || 3000;
//const HOST = process.env.HOST || 'localhost';

// Middleware
app.set('view engine', 'ejs');
app.set('views', './views');

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.render('index.ejs');
});

// Start server
app.listen(PORT, HOST, () => {
  //deployed on render.com, so we need to log the URL instead of just the port
  //console.log(`Server running at: ${PORT}`);
  console.log(`Server running at http://${HOST}:${PORT}`);
});
