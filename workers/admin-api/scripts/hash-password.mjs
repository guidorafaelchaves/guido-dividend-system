import { webcrypto as crypto } from 'node:crypto';

const password = process.argv[2];
if (!password) {
  console.error('Uso: node scripts/hash-password.mjs "sua-senha-forte"');
  process.exit(1);
}

const salt = crypto.getRandomValues(new Uint8Array(16));
const passwordBytes = new TextEncoder().encode(password);
const payload = new Uint8Array(salt.byteLength + passwordBytes.byteLength);
payload.set(salt, 0);
payload.set(passwordBytes, salt.byteLength);
const bits = await crypto.subtle.digest('SHA-256', payload);

function b64url(bytes) {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

console.log(`sha256$1$${b64url(salt)}$${b64url(new Uint8Array(bits))}`);
