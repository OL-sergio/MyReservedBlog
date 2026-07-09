import crypto from 'crypto';
import process from 'process';
import { Buffer } from 'buffer';

const ALGO = 'aes-256-gcm';

// We will store: base64(salt):base64(iv):base64(tag):base64(ciphertext)

function getMasterSecret() {
  // Static fallback key for local/dev.
  // In production you SHOULD provide DATA_ENCRYPTION_SECRET.
  const STATIC_FALLBACK = 'static-dev-fallback-change-this-in-production';

  const secret = process.env.DATA_ENCRYPTION_SECRET || STATIC_FALLBACK;

  if (!secret || String(secret).trim().length < 8) return null;
  return String(secret);
}

function deriveKey(secret, salt) {
  return crypto.pbkdf2Sync(secret, salt, 120000, 32, 'sha256');
}

export function encryptString(plainText) {
  // Keep behavior predictable for empty/null
  if (plainText === null || plainText === undefined) return plainText;

  // If no secret, keep plaintext (backwards-compatible for existing DB).
  const secret = getMasterSecret();
  if (!secret) return String(plainText);

  const text = String(plainText);

  const salt = crypto.randomBytes(16);

  const key = deriveKey(getMasterSecret(), salt);
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(ALGO, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    salt.toString('base64'),
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

export function decryptString(enc) {
  if (enc === null || enc === undefined) return enc;

  const secret = getMasterSecret();
  if (!secret) return String(enc);

  const str = String(enc);

  // Backwards compatibility for already-plaintext databases
  if (!str.includes(':')) {
    return str;
  }

  const [saltB64, ivB64, tagB64, ctB64] = str.split(':');
  if (!saltB64 || !ivB64 || !tagB64 || !ctB64) {
    // Not in our expected format
    return str;
  }

  try {
    const salt = Buffer.from(saltB64, 'base64');
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const ciphertext = Buffer.from(ctB64, 'base64');

    const key = deriveKey(getMasterSecret(), salt);

    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);

    const plain = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');

    return plain;
  } catch (err) {
    // If the secret differs between environments (or data is corrupted/tampered),
    // AES-GCM auth tag verification will fail and crypto throws.
    // Do not crash the whole request—return the original value.
    console.error('❌ decryptString failed (auth tag mismatch or bad data).', {
      algo: ALGO,
      hasAesGcmFormat: str.includes(':'),
      // Avoid logging secrets or raw ciphertext.
      valueLength: str.length,
      errorName: err?.name,
      errorMessage: err?.message,
    });

    return str;
  }
}
