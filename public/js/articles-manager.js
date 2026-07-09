import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Article from '../../models/Articles.js';
import { encryptString, decryptString } from './crypto-storage.js';

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

function decryptArticleForRuntime(article) {
  if (!article) return article;

  // decryptString is resilient (won’t throw), but keep per-field context anyway.
  try {
    return {
      ...article,
      // Encrypt-at-rest fields
      title: decryptString(article.title),
      content: decryptString(article.content),
      excerpt: decryptString(article.excerpt),
    };
  } catch (err) {
    console.error(
      '❌ decryptArticleForRuntime failed. Article id:',
      article?.id,
      {
        errorName: err?.name,
        errorMessage: err?.message,
      }
    );
    return article;
  }
}

function encryptArticleForStorage(article) {
  if (!article) return article;

  return {
    ...article,
    // Encrypt-at-rest fields
    title: encryptString(article.title),
    excerpt: encryptString(article.excerpt),
    content: encryptString(article.content),
  };
}

export class ArticleModel {
  static getAll({ publishedOnly = false } = {}) {
    const articles = readArticles();
    const filtered = publishedOnly
      ? articles.filter((a) => a.published === true)
      : articles;

    // Decrypt before returning to the app
    return filtered.map(decryptArticleForRuntime);
  }

  static getById(id) {
    const articles = readArticles();
    const found = articles.find((a) => String(a.id) === String(id)) || null;
    if (!found) return null;
    return decryptArticleForRuntime(found);
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

    const toSave = encryptArticleForStorage(article.toJSON());

    const articles = readArticles();
    articles.push(toSave);
    writeArticles(articles);

    // Return decrypted view to callers
    return decryptArticleForRuntime(toSave);
  }

  static update(id, updates) {
    const articles = readArticles();
    const index = articles.findIndex((a) => String(a.id) === String(id));
    if (index === -1) return null;

    // Decrypt runtime copy before editing/validating
    const runtimeExisting = decryptArticleForRuntime(articles[index]);
    const existing = new Article(runtimeExisting);
    existing.update(updates);

    const validation = existing.validate();
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // Preserve ownership from stored record
    existing.userID = articles[index].userID;
    existing.author = articles[index].author;

    const toSave = encryptArticleForStorage(existing.toJSON());
    articles[index] = toSave;
    writeArticles(articles);

    return decryptArticleForRuntime(toSave);
  }

  static remove(id) {
    const articles = readArticles();
    const next = articles.filter((a) => String(a.id) !== String(id));
    if (next.length === articles.length) return false;

    writeArticles(next);
    return true;
  }
}
