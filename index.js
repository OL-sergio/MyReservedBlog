import express from 'express';
import bodyParser from 'body-parser';
import process from 'process';
import session from 'express-session';
import UsersManager from './public/js/database-users-manager.js';
import { ArticleModel } from './public/js/articles-manager.js';

const app = express();
const usersManager = new UsersManager(
  './database/database-my-reserved-blog.json'
);

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

// Session middleware~
app.use(
  session({
    secret: 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 3600000 * 12, // 12 hour
    },
  })
);

//Main route
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
  const isAuthenticated = req.session.userId ? true : false;
  const user = isAuthenticated
    ? {
        id: req.session.userId,
        username: req.session.username,
        email: req.session.email,
      }
    : null;

  // mostrar artigos (podes trocar para true se quiser só publicados)
  const articles = ArticleModel.getAll({ publishedOnly: true });

  res.render('articles.ejs', { isAuthenticated, user, articles });
});

app.get('/my-articles', (req, res) => {
  const isAuthenticated = req.session.userId ? true : false;
  const user = isAuthenticated
    ? {
        id: req.session.userId,
        username: req.session.username,
        email: req.session.email,
      }
    : null;

  res.render('my-articles.ejs', { isAuthenticated, user });
});

app.get('/my-profile', (req, res) => {
  const isAuthenticated = req.session.userId ? true : false;
  const user = isAuthenticated
    ? {
        id: req.session.userId,
        username: req.session.username,
        email: req.session.email,
      }
    : null;

  res.render('my-profile.ejs', { isAuthenticated, user });
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

app.get('/articles-form', (req, res) => {
  const isAuthenticated = req.session.userId ? true : false;
  const user = isAuthenticated
    ? {
        id: req.session.userId,
        username: req.session.username,
        email: req.session.email,
      }
    : null;

  const successMessage = req.session.successMessage;
  // flash message: show once (don't touch session unless needed)
  if (successMessage) {
    req.session.successMessage = undefined;
  }

  res.render('articles-form.ejs', { isAuthenticated, user, successMessage });
});

//POST - criar artigo (salva em data/articles.json)
//FIX:  não é possivel visualizar os mensagem  ao criar artigo
//FIX:  ao criar o artigo o utilizador nao fica com sessão.
app.post('/articles-form', (req, res) => {
  const isAuthenticated = req.session.userId ? true : false;
  const user = isAuthenticated
    ? {
        id: req.session.userId,
        username: req.session.username,
        email: req.session.email,
      }
    : null;
  if (!isAuthenticated) {
    return res.render('login.ejs', {
      isAuthenticated,
      user,
      message: 'Unauthorized',
    });
  }
  try {
    const created = ArticleModel.create({
      title: req.body.title,

      excerpt: req.body.excerpt,
      content: req.body.content,
      published: req.body.published,

      // garante que userID/author pertencem sempre ao utilizador logado
      userID: req.session.userId,
      author: req.session.username,

      tags: req.body.tags ?? [],
    });

    // PRG pattern: POST -> redirect avoids re-rendering issues and keeps session intact
    console.log('Articles data: ', created);

    // Flash message via session (locals do not survive redirects)
    req.session.successMessage = 'Article created successfully!';

    // redirect back to the form page so the flash message shows correctly
    return res.redirect('/articles-form');
  } catch (e) {
    // classic HTML form submit: re-render the form (not login) with error
    return res.status(400).render('articles-form.ejs', {
      isAuthenticated,
      user,
      errorMessage: e.message,
    });
  }
});

// -------------------------
// Articles API (JSON file)
// Uses: public/js/articles-manager.js -> data/articles.json
// -------------------------

// GET - listar artigos
app.get('/articles-api', (req, res) => {
  const isAuthenticated = req.session.userId ? true : false;
  if (!isAuthenticated) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // podes trocar publishedOnly para true se quiseres só publicados
  const articles = ArticleModel.getAll({ publishedOnly: false });
  res.json(articles);
});

// GET - artigo por id
app.get('/articles-api/:id', (req, res) => {
  const isAuthenticated = req.session.userId ? true : false;
  if (!isAuthenticated) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const article = ArticleModel.getById(req.params.id);
  if (!article) return res.status(404).json({ message: 'Article not found' });

  res.json(article);
});

// PUT - atualizar artigo
app.put('/articles-api/:id', (req, res) => {
  const isAuthenticated = req.session.userId ? true : false;
  if (!isAuthenticated) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // ownership (userID/author) é fixo no ArticleModel.update()
  const updated = ArticleModel.update(req.params.id, req.body);
  if (!updated) return res.status(404).json({ message: 'Article not found' });

  res.json(updated);
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

//experimental routes for testing the UsersManager class

// DELETE - remover artigo
app.delete('/articles-api/:id', (req, res) => {
  const isAuthenticated = req.session.userId ? true : false;
  if (!isAuthenticated) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const ok = ArticleModel.remove(req.params.id);
  if (!ok) return res.status(404).json({ message: 'Article not found' });

  res.json({ success: true });
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

// DELETE - Eliminar utilizador
app.delete('/users/:id', (req, res) => {
  usersManager.deleteUser(parseInt(req.params.id));
  res.json({ message: 'Utilizador eliminado' });
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

// Start server
app.listen(PORT, HOST, () => {
  //deployed on render.com, so we need to log the URL instead of just the port
  //console.log(`Server running at: ${PORT}`);
  console.log(`Server running at http://${HOST}:${PORT}`);
});
