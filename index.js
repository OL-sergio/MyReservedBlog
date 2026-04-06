import express from 'express';
import bodyParser from 'body-parser';

const app = express(); 

const PORT = process.env.PORT || 3000;
const HOST = 'localhost';

// Middleware
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
      res.send('Welcome to MyReservedBlog');
});

// Start server
app.listen(PORT, HOST, () => {
      console.log(`Server running at http://${HOST}:${PORT}`);
});