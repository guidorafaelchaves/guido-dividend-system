import { webcrypto as crypto } from 'node:crypto';

const password = process.argv[2];
if (!password) {
  console.error('Uso: node scripts/hash-password.mjs "sua-senha-forte"');
  process.exit(1);
}

const iterations = 210000;
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(password),
  'PBKDF2',
  false,
  ['deriveBits']
);
const bits = await crypto.subtle.deriveBits(
  { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
  key,
  256
);

function b64url(bytes) {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

console.log(`pbkdf2$${iterations}$${b64url(salt)}$${b64url(new Uint8Array(bits))}`);
