import express from 'express';
import bodyParser from 'body-parser';
import process from 'process';
import session from 'express-session';
import UsersManager from './public/js/database-users-manager.js';

const app = express();
const usersManager = new UsersManager(
  './database/database-my-reserved-blog.json'
);

// TODO: render.com provides the PORT and HOST environment variables,
// so we need to use those instead of hardcoding them
//const PORT = process.env.PORT || 10000;
// const HOST = process.env.HOST || '0.0.0.0';

// TODO: For local development, you can uncomment the lines
//  below and comment out the lines above
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

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
  const isAuthenticated = req.session.userId ? true : false;
  const user = isAuthenticated
    ? {
        id: req.session.userId,
        username: req.session.username,
        email: req.session.email,
      }
    : null;

  res.render('index.ejs', { isAuthenticated, user });
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
  res.json(usersManager.getAllUsers());
});

// DEBUG - Testar busca por email
app.get('/debug/user/:email', (req, res) => {
  const user = usersManager.getUserByEmail(req.params.email);
  res.json({
    email: req.params.email,
    found: user ? true : false,
    user: user || { message: 'Utilizador não encontrado' },
  });
});

// POST - Login de utilizador
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  console.log('🔐 Tentativa de login:', email);

  // Validar dados
  if (!email || !password) {
    console.log('❌ Email ou password vazios');
    return res.status(400).send('<h1>Email e password são obrigatórios</h1>');
  }

  // Procurar utilizador por email
  const user = usersManager.getUserByEmail(email);
  if (!user) {
    console.log('❌ Utilizador não encontrado:', email);
    return res.status(401).send('<h1>Email ou password incorretos</h1>');
  }

  console.log('👤 Utilizador encontrado:', user.username);
  console.log('🔑 Password guardada:', user.password);
  console.log('🔑 Password fornecida:', password);

  // Verificar password (para agora, comparação simples - depois usar bcrypt)
  if (user.password !== password) {
    console.log('❌ Password incorreta para:', email);
    return res.status(401).send('<h1>Email ou password incorretos</h1>');
  }

  // Criar sessão
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.email = user.email;

  // Guardar sessão explicitamente
  req.session.save((err) => {
    if (err) {
      console.error('❌ Erro ao guardar sessão:', err);
      return res.status(500).json({ message: 'Erro ao guardar sessão' });
    }

    console.log('✅ Sessão guardada para:', user.username);
    console.log('✅ Utilizador autenticado:', user.username);

    res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  });
});

// POST - Criar novo utilizador
app.post('/register', (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  const existingUser = usersManager.getUserName(username);
  const existingEmail = usersManager.getUserByEmail(email);

  // Validar dados
  if (!username) {
    console.log('❌ Username vazio');
    return res.status(400).json({
      success: false,
      message: 'Email é obrigatório',
    });
  }

  if (!email) {
    console.log('❌ Email vazio');
    return res.status(400).json({
      success: false,
      message: 'Email é obrigatório',
    });
  }
  if (!password) {
    console.log('❌ Password vazia');
    return res.status(400).json({
      success: false,
      message: 'Password é obrigatória',
    });
  }
  if (!confirmPassword) {
    console.log('❌ Confirm password vazio');
    return res.status(400).json({
      success: false,
      message: 'Confirmar password é obrigatório',
    });
  }

  // Verificar se username já existe
  if (username.trim() === existingUser?.username) {
    console.log('❌ Username já registado');
    return res.status(400).json({
      success: false,
      message: 'Username já registado',
    });
  }

  // Verificar se email já existe
  if (existingEmail && existingEmail.email === email.trim()) {
    console.log('❌ Email já registado');
    return res.status(400).json({
      success: false,
      message: 'Email já registado',
    });
  }

  if (password.trim() !== confirmPassword.trim()) {
    console.log('❌ Password e confirm password não coincidem');
    return res.status(400).json({
      success: false,
      message: 'Password e confirm password não coincidem',
    });
  }

  const newUser = usersManager.addUser(username, email, password);
  console.log('✅ Novo utilizador criado:', newUser);

  // Criar sessão também
  req.session.userId = newUser.id;
  req.session.username = newUser.username;
  req.session.email = newUser.email;

  // Guardar sessão explicitamente
  req.session.save((err) => {
    if (err) {
      console.error('❌ Erro ao guardar sessão:', err);
      return res.status(500).json({ message: 'Erro ao guardar sessão' });
    }

    console.log('✅ Sessão guardada para:', newUser.username);

    res.status(201).json({
      success: true,
      message: 'Utilizador criado com sucesso',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
      },
    });
  });
});

// PUT - Atualizar utilizador
app.put('/users/:id', (req, res) => {
  const updatedUser = usersManager.updateUser(
    parseInt(req.params.id),
    req.body
  );
  if (updatedUser) {
    res.json(updatedUser);
  } else {
    res.status(404).json({ message: 'Utilizador não encontrado' });
  }
});

// GET - Obter utilizador por ID
app.get('/users/:id', (req, res) => {
  const user = usersManager.getUserById(parseInt(req.params.id));
  if (user) {
    res.status(200).json(user);
  } else {
    res.status(404).json({ message: 'Utilizador não encontrado' });
  }
});

// DELETE - Eliminar utilizador
app.delete('/users/:id', (req, res) => {
  usersManager.deleteUser(parseInt(req.params.id));
  res.json({ message: 'Utilizador eliminado' });
});

// GET - Logout
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erro ao fazer logout:', err);
    }
    console.log('✅ Logout realizado');
    res.redirect('/');
  });
});

// Start server
app.listen(PORT, HOST, () => {
  //deployed on render.com, so we need to log the URL instead of just the port
  //console.log(`Server running at: ${PORT}`);
  console.log(`Server running at http://${HOST}:${PORT}`);
});
