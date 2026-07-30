// Password hashing using Node's built-in crypto (scrypt) — no external
// dependency required. Stores salt + hash together as "salt:hash".

const crypto = require('crypto');

function hash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 32).toString('hex');
  return salt + ':' + derived;
}

function compare(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, derived] = stored.split(':');
  const check = crypto.scryptSync(String(password), salt, 32).toString('hex');
  const a = Buffer.from(check, 'hex');
  const b = Buffer.from(derived, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { hash, compare };
