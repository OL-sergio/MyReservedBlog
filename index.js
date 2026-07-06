import express from 'express';
import session from 'express-session';
import process from 'process';
import { UserManager } from './public/js/users-manager.js';
import { ArticleModel } from './public/js/articles-manager.js';

const app = express();
// TODO: render.com provides the PORT and HOST environment variables,
// so we need to use those instead of hardcoding them
//const PORT = express.env.PORT || 10000;
//const HOST = express.env.HOST || '0.0.0.0';

// TODO: For local development, you can uncomment the lines
//  below and comment out the lines above
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.set('view engine', 'ejs');
app.set('views', './views');
app.set('trust proxy', 1);

app.use(express.static('public'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware~
app.use(
  session({
    secret: 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 3600000 * 12, // 12 hour
    },
  })
);

const getAuthContext = (req) => {
  const isAuthenticated = Boolean(req.session.userId);
  const user = isAuthenticated
    ? {
        id: req.session.userId,
        username: req.session.username,
        email: req.session.email,
      }
    : null;

  return { isAuthenticated, user };
};

const renderMyArticlesPage = (req, res, { successMessage = null } = {}) => {
  const { isAuthenticated, user } = getAuthContext(req);

  const allArticles = ArticleModel.getAll({ publishedOnly: false });
  const myArticles = isAuthenticated
    ? allArticles
        .filter((a) => String(a.userID) === String(req.session.userId))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : [];

  return res.render('my-articles.ejs', {
    isAuthenticated,
    user,
    articles: myArticles,
    successMessage,
  });
};

//Main route
app.get('/', (req, res) => {
  const { isAuthenticated, user } = getAuthContext(req);

  // Get articles from DB and order by newest first
  const allArticles = ArticleModel.getAll({ publishedOnly: false });
  const sortedByDateDesc = [...allArticles].sort((a, b) => {
    const da = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db - da;
  });

  const latestArticle = sortedByDateDesc[0] ?? null;
  const featuredArticle = sortedByDateDesc[1] ?? null;
  const nextArticles = sortedByDateDesc.slice(2, 5); // small set for the cards
  const bottomArticles = sortedByDateDesc[6] ?? null;

  res.render('index.ejs', {
    isAuthenticated,
    user,
    latestArticle,
    featuredArticle,
    nextArticles,
    bottomArticles,
  });
});

app.get('/articles', (req, res) => {
  const { isAuthenticated, user } = getAuthContext(req);

  // mostrar artigos (podes trocar para true se quiser s� publicados)
  const articles = ArticleModel.getAll({ publishedOnly: true }).reverse();

  res.render('articles.ejs', { isAuthenticated, user, articles });
});

app.get('/my-articles', (req, res) => {
  const { isAuthenticated, user } = getAuthContext(req);

  // Flash message for update/delete/etc.
  const successMessage = req.session.successMessage;
  if (successMessage) {
    req.session.successMessage = undefined;
  }

  // Use ArticleModel (articles-manager) and filter by ownership.
  // Stored ownership field (see articles-manager.js) is `userID`.
  const allArticles = ArticleModel.getAll({ publishedOnly: false });
  const myArticles = isAuthenticated
    ? allArticles
        .filter((a) => String(a.userID) === String(req.session.userId))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : [];

  res.render('my-articles.ejs', {
    isAuthenticated,
    user,
    articles: myArticles,
    successMessage,
  });
});

app.get('/my-profile', (req, res) => {
  const { isAuthenticated, user } = getAuthContext(req);

  res.render('my-profile.ejs', { isAuthenticated, user });
});

// -------------------------
// Articles API (JSON file)
// Uses: public/js/articles-manager.js -> data/articles.json
// -------------------------

// DELETE - remover artigo
app.delete('/view-article/:id', (req, res) => {
  const { isAuthenticated, user } = getAuthContext(req);
  if (!isAuthenticated) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const ok = ArticleModel.remove(req.params.id);
  if (!ok) return res.status(404).json({ message: 'Article not found' });

  req.session.successMessage = 'Article deleted successfully!';
  return req.session.save((err) => {
    if (err) {
      console.error('❌ Erro ao guardar sessão:', err);
      return res.status(500).json({ message: 'Erro ao guardar sessão' });
    }

    res.render('my-articles.ejs', { isAuthenticated, user });
  });
});

// View a single article
app.get('/view-article/:id', (req, res) => {
  const { isAuthenticated, user } = getAuthContext(req);

  const article = ArticleModel.getById(req.params.id);

  if (!article) {
    return res.status(404).render('error.ejs', {
      isAuthenticated,
      user,
      message: 'Article not found',
    });
  }

  res.render('view-article.ejs', { isAuthenticated, user, article });
});

app.get('/articles-form', (req, res) => {
  const { isAuthenticated, user } = getAuthContext(req);

  const successMessage = req.session.successMessage;
  // flash message: show once (don't touch session unless needed)
  if (successMessage) {
    req.session.successMessage = undefined;
  }

  const editId = req.query.edit;
  const article = editId ? ArticleModel.getById(editId) : null;

  res.render('articles-form.ejs', {
    isAuthenticated,
    user,
    successMessage,
    article,
  });
});

app.post('/articles-form', (req, res) => {
  const { isAuthenticated, user } = getAuthContext(req);

  if (!isAuthenticated) {
    return res.redirect('/login');
  }

  // Check if updating an existing article
  if (req.body.id) {
    try {
      const updated = ArticleModel.update(req.body.id, {
        title: req.body.title,
        excerpt: req.body.excerpt,
        content: req.body.content,
        published:
          req.body.published === 'true' ||
          req.body.published === true ||
          req.body.published === 'on',
        tags: req.body.tags ?? [],
      });
      console.log('Article updated: ', updated);

      req.session.successMessage = 'Article updated successfully!';
      return req.session.save((err) => {
        if (err) {
          console.error('❌ Erro ao guardar sessão:', err);
          return res.status(500).render('articles-form.ejs', {
            isAuthenticated,
            user,
            errorMessage: 'Erro ao guardar sessão',
            article: {
              id: req.body.id,
              title: req.body.title,
              excerpt: req.body.excerpt,
              content: req.body.content,
              published: req.body.published,
            },
          });
        }

        return res.redirect('/my-articles');
      });
    } catch (e) {
      return res.status(400).render('articles-form.ejs', {
        isAuthenticated,
        user,
        errorMessage: e.message,
        article: {
          id: req.body.id,
          title: req.body.title,
          excerpt: req.body.excerpt,
          content: req.body.content,
          published: req.body.published,
        },
      });
    }
  }

  try {
    const created = ArticleModel.create({
      title: req.body.title,

      excerpt: req.body.excerpt,
      content: req.body.content,
      published: req.body.published,

      // garante que userID/author pertencem sempre ao utilizador realiza login (não confies em dados do cliente)
      userID: req.session.userId,
      author: req.session.username,

      tags: req.body.tags ?? [],
    });

    // PRG pattern: POST -> redirect avoids re-rendering issues and keeps session intact
    console.log('Articles data: ', created);

    req.session.successMessage = 'Article created successfully!';

    return req.session.save((err) => {
      if (err) {
        console.error('❌ Erro ao guardar sessão:', err);
        return res.status(500).render('articles-form.ejs', {
          isAuthenticated,
          user,
          errorMessage: 'Erro ao guardar sessão',
        });
      }

      return res.redirect('/articles-form');
    });
  } catch (e) {
    // classic HTML form submit: re-render the form (not login) with error
    return res.status(400).render('articles-form.ejs', {
      isAuthenticated,
      user,
      errorMessage: e.message,
    });
  }
});

app.get('/login', (req, res) => {
  res.render('login.ejs');
});

app.get('/register', (req, res) => {
  res.render('register.ejs');
});

// POST - Login de utilizador
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  console.log('🔐 Tentativa de login:', email);

  // Validar dados
  if (!email || !password) {
    console.log('❌ Email ou password vazios');
    return res.status(400).json({
      success: false,
      message: 'Email e password são obrigatórios',
    });
  }

  // Normalização de email (alinhada com UserManager.getByEmail)
  // Mantém caracteres especiais do local-part e apenas ajusta trim + casing.
  const normalizedEmail = String(email).trim().toLowerCase();

  // Validar formato de email (para evitar lookup desnecessário)
  // (mantém um regex simples compatível com os requisitos do projeto)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ success: false, message: 'Email inválido' });
  }

  // Procurar utilizador por email
  const user = UserManager.getByEmail(normalizedEmail);

  // Unificar mensagem para não revelar se o email existe ou não
  const invalidCredentials = () =>
    res.status(401).json({
      success: false,
      message: 'Email ou password incorretos',
    });

  if (!user) {
    console.log('❌ Utilizador não encontrado para:', normalizedEmail);
    return invalidCredentials();
  }

  // Verificar password (para agora, comparação simples - depois usar bcrypt)
  if (user.password !== password) {
    // Debug seguro: não imprime a password (evita expor segredos), mas ajuda
    // a perceber se o valor recebido difere (ex.: escaping/encoding).
    console.warn('❌ Password incorreta para:', normalizedEmail, {
      storedPasswordLength: String(user.password ?? '').length,
      receivedPasswordLength: String(password ?? '').length,
    });

    return invalidCredentials();
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

    return res.status(200).json({
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

  const existingUser = UserManager.getByUsername(username);
  const existingEmail = UserManager.getByEmail(email);

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

  // Verificar se email já existe (normalizado)
  if (
    existingEmail &&
    String(existingEmail.email ?? '')
      .trim()
      .toLowerCase() ===
      String(email ?? '')
        .trim()
        .toLowerCase()
  ) {
    console.log('❌ Email já registado');
    return res.status(400).json({
      success: false,
      message: 'Email já registado',
    });
  }

  // Verificar se as passwords coincidem
  // Important: do NOT trim password, otherwise special/leading/trailing spaces become different.
  if (String(password ?? '') !== String(confirmPassword ?? '')) {
    console.log('❌ Password e confirm password não coincidem');
    return res.status(400).json({
      success: false,
      message: 'Password e confirm password não coincidem',
    });
  }

  const newUser = UserManager.create({ username, email, password });
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

/*
// -------------------------
// -------------------------
// -------------------------
// -------------------------
// -------------------------
// -------------------------
// Experimental routes for testing the UsersManager class
// DEBUG - Testar busca por email
// -------------------------
app.get('/debug/user/:email', (req, res) => {
  const user = UserManager.getByEmail(req.params.email);
  res.json({
    email: req.params.email,
    found: user ? true : false,
    user: user || { message: 'Utilizador não encontrado' },
  });
});

// PUT - Atualizar utilizador
app.put('/users/:id', (req, res) => {
  const updatedUser = UserManager.update(parseInt(req.params.id), req.body);
  if (updatedUser) {
    res.json(updatedUser);
  } else {
    res.status(404).json({ message: 'Utilizador não encontrado' });
  }
});

// PUT - Update article
/*app.put('/articles-form', (req, res) => {
  const { isAuthenticated, user } = getAuthContext(req);
  console.log('PUT /articles-form called with body:', req.body);
  console.log('Session userId:', user ? user.id : 'not logged in');

  if (!isAuthenticated) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const articleId = req.body.id;
    if (!articleId) {
      return res.status(400).json({ message: 'Article ID required' });
    }
    const updated = ArticleModel.update(articleId, {
      title: req.body.title,
      excerpt: req.body.excerpt,
      content: req.body.content,
      published:
        req.body.published === 'true' ||
        req.body.published === true ||
        req.body.published === 'on',
    });

    console.log('Article updated: ', updated);

    return renderMyArticlesPage(req, res, {
      successMessage: 'Article updated successfully!',
    });
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
});*/

/*
// GET - listar artigos
app.get('/articles-api', (req, res) => {
  const { isAuthenticated } = getAuthContext(req);
  if (!isAuthenticated) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // podes trocar publishedOnly para true se quiseres só publicados
  const articles = ArticleModel.getAll({ publishedOnly: false });
  res.json(articles);
});

// GET - artigo por id
app.get('/articles-api/:id', (req, res) => {
  const { isAuthenticated } = getAuthContext(req);
  if (!isAuthenticated) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const article = ArticleModel.getById(req.params.id);
  if (!article) return res.status(404).json({ message: 'Article not found' });

  res.json(article);
});

// PUT - atualizar artigo
app.put('/articles-api/:id', (req, res) => {
  const { isAuthenticated } = getAuthContext(req);
  if (!isAuthenticated) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const updated = ArticleModel.update(req.params.id, {
    ...req.body,
    published:
      req.body.published === 'true' ||
      req.body.published === true ||
      req.body.published === 'on',
  });

  if (!updated) return res.status(404).json({ message: 'Article not found' });
  req.session.successMessage = 'Article updated successfully!';
  // API -> return JSON (não renderizar EJS dentro de endpoint JSON)
  return res.json(updated);
});
*/

/*
// POST - remover artigo via form (HTML forms cannot send DELETE)
app.post('/view-article/:id/delete', (req, res) => {
  const { isAuthenticated } = getAuthContext(req);
  if (!isAuthenticated) {
    // if request comes from browser form, redirect to login
    return res.redirect('/login');
  }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).send('Invalid article id');

  const ok = ArticleModel.remove(id);
  if (!ok) return res.status(404).send('Article not found');

  req.session.successMessage = 'Article deleted successfully!';
  return req.session.save((err) => {
    if (err) {
      console.error('❌ Erro ao guardar sessão:', err);
      return res.status(500).send('Erro ao guardar sessão');
    }

    return res.redirect('/my-articles');
  });
});*/
/*
// DELETE - Eliminar utilizador
app.delete('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  UserManager.remove(parseInt(req.params.id));
  res.json({ message: 'Utilizador eliminado' });
});

app.get('/view-articles', (req, res) => {
  const { isAuthenticated, user } = getAuthContext(req);

  res.render('view-articles.ejs', { isAuthenticated, user });
});

// GET - Obter utilizador por ID
app.get('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  const user = UserManager.getById(parseInt(req.params.id));
  if (user) {
    res.status(200).json(user);
  } else {
    res.status(404).json({ message: 'Utilizador não encontrado' });
  }
});

app.get('/users', (req, res) => {
  res.json(UserManager.getAll());
});
*/

// Start server
app.listen(PORT, HOST, () => {
  //deployed on render.com, so we need to log the URL instead of just the port
  //console.log(`Server running at: ${PORT}`);
  console.log(`Server running at http://${HOST}:${PORT}`);
});
