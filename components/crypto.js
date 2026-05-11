import { Buffer } from 'buffer';
import fs from 'fs';
import crypto from 'crypto';

const passwordSecretKey = 'sua-senha-muito-forte-e-segura';
const encryptionKey = crypto.scryptSync(passwordSecretKey, 'salt', 32);



function encryptData(data) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);

  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    iv: iv.toString('hex'),
    encrypted,
    authTag: cipher.getAuthTag().toString('hex'),
  };
}

function decryptData(encryptedObj) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    encryptionKey,
    Buffer.from(encryptedObj.iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(encryptedObj.authTag, 'hex'));

  let decrypted = decipher.update(encryptedObj.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted);
}

// Usar
const contacts = [{ nome: 'João', email: 'joao@email.com' }];
const encrypt = encryptData(contacts);
fs.writeFileSync('dados.json', JSON.stringify(encrypt));

// Desencriptar
const dados = JSON.parse(fs.readFileSync('dados.json'));
const decrypted = decryptData(dados);
console.log(decrypted);
