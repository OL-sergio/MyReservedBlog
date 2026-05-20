import express from 'express';
import bodyParser from 'body-parser';
import process from 'process';
import session from 'express-session';
import { UserManager } from './models/UserManager.js';

const app = express();
const userManager = new UserManager('./database/users.json');

// TODO: render.com provides the PORT and HOST environment variables,
// so we need to use those instead of hardcoding them
const PORT = process.env.PORT || 10000;
const HOST = process.env.HOST || '0.0.0.0';

// TODO: For local development, you can uncomment the lines
//  below and comment out the lines above
//const PORT = process.env.PORT || 3000;
//const HOST = process.env.HOST || 'localhost';

// Middleware
app.set('view engine', 'ejs');
app.set('views', './views');

app.use(express.static('public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware
app.use(
  session({
    secret: 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true, maxAge: 3600000 }, // 1 hour
  })
);

// Routes
app.get('/', (req, res) => {
  res.render('index.ejs');
});

app.get('/articles', (req, res) => {
  res.render('articles.ejs');
});

app.get('/login', (req, res) => {
  res.render('login.ejs');
});

app.get('/register', (req, res) => {
  res.render('register.ejs');
});

app.get('/users', (req, res) => {
  res.json(userManager.getAllUsers());
});

// POST - Login de utilizador
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Validar dados
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: 'Email e password são obrigatórios' });
  }

  // Procurar utilizador por email
  const user = userManager.getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ message: 'Email ou password incorretos' });
  }

  // Verificar password (para agora, comparação simples - depois usar bcrypt)
  if (user.password !== password) {
    return res.status(401).json({ message: 'Email ou password incorretos' });
  }

  // Criar sessão
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.email = user.email;

  console.log('✅ Utilizador autenticado:', user.username);
  res.status(200).redirect('/');
});

// POST - Criar novo utilizador
app.post('/register', (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  // Validar dados
  if (!username || !email || !password || !confirmPassword) {
    return res
      .status(400)
      .json({ message: 'Todos os campos são obrigatórios' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'As senhas não coincidem' });
  }

  // Verificar se email já existe
  const existingUser = userManager.getUserByEmail(email);
  if (existingUser) {
    return res.status(400).json({ message: 'Email já registado' });
  }

  const newUser = userManager.addUser(username, email, password);
  console.log('✅ Novo utilizador criado:', newUser);
  res.status(201).redirect('/');
});

// PUT - Atualizar utilizador
app.put('/users/:id', (req, res) => {
  const updatedUser = userManager.updateUser(parseInt(req.params.id), req.body);
  if (updatedUser) {
    res.json(updatedUser);
  } else {
    res.status(404).json({ message: 'Utilizador não encontrado' });
  }
});

// GET - Obter utilizador por ID
app.get('/users/:id', (req, res) => {
  const user = userManager.getUserById(parseInt(req.params.id));
  if (user) {
    res.status(200).json(user);
  } else {
    res.status(404).json({ message: 'Utilizador não encontrado' });
  }
});

// DELETE - Eliminar utilizador
app.delete('/users/:id', (req, res) => {
  userManager.deleteUser(parseInt(req.params.id));
  res.json({ message: 'Utilizador eliminado' });
});

// Start server
app.listen(PORT, HOST, () => {
  //deployed on render.com, so we need to log the URL instead of just the port
  //console.log(`Server running at: ${PORT}`);
  console.log(`Server running at http://${HOST}:${PORT}`);
});
