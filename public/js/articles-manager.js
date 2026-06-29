import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Article from '../../models/Articles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(
  __dirname,
  '..',
  '..',
  'database',
  'database-articles-my-reserved-blog.json'
);

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
  static getAll({ publishedOnly = false } = {}) {
    const articles = readArticles();
    if (!publishedOnly) return articles;
    return articles.filter((a) => a.published === true);
  }

  static getById(id) {
    const articles = readArticles();
    return articles.find((a) => String(a.id) === String(id)) || null;
  }

  static create(data) {
    const article = new Article(data);

    // Validate using Article model
    const validation = article.validate();
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // Generate ID if not provided
    article.id = Date.now();
    article.createdAt = new Date().toISOString();
    article.updatedAt = article.createdAt;

    const articles = readArticles();
    articles.push(article.toJSON());
    writeArticles(articles);

    return article.toJSON();
  }

  static update(id, updates) {
    const articles = readArticles();
    const index = articles.findIndex((a) => String(a.id) === String(id));
    if (index === -1) return null;

    const existing = new Article(articles[index]);
    existing.update(updates);

    const validation = existing.validate();
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // Preserve ownership
    existing.userID = articles[index].userID;
    existing.author = articles[index].author;

    articles[index] = existing.toJSON();
    writeArticles(articles);
    return articles[index];
  }

  static remove(id) {
    const articles = readArticles();
    const next = articles.filter((a) => String(a.id) !== String(id));
    if (next.length === articles.length) return false;

    writeArticles(next);
    return true;
  }
}
