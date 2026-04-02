import express from 'express';

const app = express();

const PORT = process.env.PORT || 3000;
const HOST = 'localhost';

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
      res.send('Welcome to MyReservedBlog');
});

// Start server
app.listen(PORT, HOST, () => {
      console.log(`Server running at http://${HOST}:${PORT}`);
});