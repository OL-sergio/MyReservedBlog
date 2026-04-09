import express from 'express';
import bodyParser from 'body-parser';
import process from 'process';

const app = express();

const PORT = process.env.PORT || 1000;
const HOST = 'localhost';

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
  console.log(`Server running at http://${HOST}:${PORT}`);
});
