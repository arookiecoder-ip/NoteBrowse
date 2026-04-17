import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scrypt,
  ScryptOptions,
  timingSafeEqual,
} from "node:crypto";

function scryptAsync(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

// ── AES-256-GCM encryption ──────────────────────────────────────────

const KEY_BYTES = 32;
const NONCE_BYTES = 12;
const TAG_BYTES = 16;

function readKey(): Buffer {
  const raw = process.env.NOTEBOOK_ENCRYPTION_KEY;
  if (!raw) throw new Error("NOTEBOOK_ENCRYPTION_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) throw new Error("NOTEBOOK_ENCRYPTION_KEY must decode to 32 bytes");
  return key;
}

export interface CiphertextRecord {
  ciphertext: string;
  nonce: string;
  keyVersion: number;
}

export function encrypt(plaintext: string): CiphertextRecord {
  const key = readKey();
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: Buffer.concat([encrypted, tag]).toString("base64"),
    nonce: nonce.toString("base64"),
    keyVersion: 1,
  };
}

export function decrypt(record: CiphertextRecord): string {
  if (record.keyVersion !== 1) throw new Error("Unsupported key version");

  const key = readKey();
  const nonce = Buffer.from(record.nonce, "base64");
  const payload = Buffer.from(record.ciphertext, "base64");

  if (payload.length <= TAG_BYTES) throw new Error("Invalid ciphertext");

  const encrypted = payload.subarray(0, payload.length - TAG_BYTES);
  const tag = payload.subarray(payload.length - TAG_BYTES);

  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

// ── Password hashing (scrypt, async) ────────────────────────────────
// Using N=8192, r=8, p=1 — ~50ms per hash instead of ~200ms.
// Still provides strong brute-force resistance with rate limiting on top.

const SCRYPT_OPTS = { N: 8192, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, 64, SCRYPT_OPTS);
  return `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, derivedB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !derivedB64) return false;

  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(derivedB64, "base64");
  const actual = await scryptAsync(password, salt, expected.length, SCRYPT_OPTS);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// ── HMAC signing (for session cookies) ──────────────────────────────

export function hmacSign(data: string): string {
  return createHmac("sha256", readKey()).update(data).digest("hex");
}

export function hmacVerify(data: string, signature: string): boolean {
  const expected = hmacSign(data);
  if (expected.length !== signature.length) return false;

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  return timingSafeEqual(a, b);
}
