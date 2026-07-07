import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../../models/User.js';
import { encryptString, decryptString } from './crypto-storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(
  __dirname,
  '..',
  '..',
  'database',
  'database-users-my-reserved-blog.json'
);

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

function readUsers() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeUsers(users) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

export class UserManager {
  static getAll() {
    const users = readUsers();
    return users.map((u) => ({
      ...u,
      password: decryptString(u.password),
      email: decryptString(u.email),
    }));
  }

  static getById(id) {
    const users = readUsers();
    const found = users.find((u) => String(u.id) === String(id)) || null;
    if (!found) return null;
    return {
      ...found,
      password: decryptString(found.password),
      email: decryptString(found.email),
    };
  }

  static getByEmail(email) {
    const users = readUsers();

    const normalizedEmail = String(email ?? '')
      .trim()
      .toLowerCase();

    // IMPORTANT:
    // - Some DB entries store email encrypted (contains ':')
    // - Some entries are already plaintext
    // We MUST decrypt each stored email before comparing.
    const found =
      users.find((u) => {
        const decryptedEmail = decryptString(u.email);
        return (
          String(decryptedEmail ?? '')
            .trim()
            .toLowerCase() === normalizedEmail
        );
      }) || null;

    if (!found) return null;

    return {
      ...found,
      email: decryptString(found.email),
      password: decryptString(found.password),
    };
  }

  static getByUsername(username) {
    const users = readUsers();
    return users.find((u) => u.username === username) || null;
  }

  static create(data) {
    const user = new User(data);

    const validation = user.validate();
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // Check existing
    const users = readUsers();

    const normalizedEmail = String(user.email ?? '')
      .trim()
      .toLowerCase();

    if (
      users.some(
        (u) =>
          String(u.email ?? '')
            .trim()
            .toLowerCase() === normalizedEmail
      )
    ) {
      throw new Error('Email already in use');
    }

    if (users.some((u) => u.username === user.username)) {
      throw new Error('Username already in use');
    }

    // Create next integer id (no dates)
    const nextId = users.reduce(
      (max, u) => Math.max(max, Number(u.id) || 0),
      0
    );
    user.id = nextId + 1;

    // Keep defaults minimal
    user.password = user.password || '';
    user.role = user.role || 'user';
    // Preserve createdAt/updatedAt coming from the model/constructor

    // Encrypt password at rest (AES-256-GCM)
    const toSave = user.toJSON();
    toSave.email = encryptString(toSave.email);
    toSave.password = encryptString(toSave.password);

    users.push(toSave);
    writeUsers(users);

    // Return decrypted view to callers
    return {
      ...toSave,
      email: String(user.email ?? ''),
      password: String(user.password ?? ''),
    };
  }

  static update(id, updates) {
    const users = readUsers();

    const index = users.findIndex((u) => String(u.id) === String(id));
    if (index === -1) return null;

    const existing = new User(users[index]);
    existing.update(updates);

    const validation = existing.validate();
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    users[index] = existing.toJSON();
    writeUsers(users);
    return users[index];
  }

  static remove(id) {
    const users = readUsers();
    const next = users.filter((u) => String(u.id) !== String(id));
    if (next.length === users.length) return false;

    writeUsers(next);
    return true;
  }

  static authenticate(email, password) {
    const user = this.getByEmail(email);
    if (!user || !user.isActive) return null;
    if (user.password !== password) return null;
    return user;
  }
}

export default UserManager;
