import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Where your JSON data will be stored:
// Use the existing articles file already present in your project
const DATA_FILE = path.join(__dirname, '..', '..', 'database', 'database.json');

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

function readArticles() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeArticles(articles) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(articles, null, 2), 'utf-8');
}

export class ArticleModel {
  // Return all articles (optionally only published)
  static getAll({ publishedOnly = false } = {}) {
    const articles = readArticles();
    if (!publishedOnly) return articles;
    return articles.filter((a) => a.published === true);
  }

  static getById(id) {
    const articles = readArticles();
    return articles.find((a) => String(a.id) === String(id)) || null;
  }

  static create({
    title,
    excerpt = '',
    content,
    published = false,
    author = null, // username (compatibilidade com JSON existente)
    userID = null, // user id logged (novo)
    tags = [],
  }) {
    if (!title || !content) {
      throw new Error('Missing required fields: title, content');
    }

    const articles = readArticles();

    const now = new Date().toISOString();
    const article = {
      id: Date.now(), // Simple unique ID based on timestamp
      title,
      excerpt,
      content,
      published: Boolean(published),

      // novo campo: userID do utilizador logado
      userID,
      // manter author como "nome de utilizador" (ou compatibilidade)
      author,

      tags,
      createdAt: now,
      updatedAt: now,
    };

    articles.push(article);
    writeArticles(articles);

    return article;
  }

  static update(id, updates) {
    const articles = readArticles();
    const index = articles.findIndex((a) => String(a.id) === String(id));
    if (index === -1) return null;

    const now = new Date().toISOString();
    const existing = articles[index];

    // "fixar" ownership no update (não permitir alterar author/userID via body)
    const updated = {
      ...existing,
      ...updates,

      // garante que não muda com updates vindo do client
      author: existing.author,
      userID: existing.userID,

      updatedAt: now,
    };

    articles[index] = updated;
    writeArticles(articles);
    return updated;
  }

  static remove(id) {
    const articles = readArticles();
    const next = articles.filter((a) => String(a.id) !== String(id));
    if (next.length === articles.length) return false;

    writeArticles(next);
    return true;
  }
}
