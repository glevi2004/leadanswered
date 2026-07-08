import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../../env.js";

/**
 * AES-256-GCM encryption for Google tokens at rest (GOOGLE_CALENDAR.md §13). Encrypt on write, decrypt
 * on use, never log plaintext. Output is base64 of iv(12) | authTag(16) | ciphertext.
 */
const ALGO = "aes-256-gcm";

/** 32-byte key from CALENDAR_TOKEN_KEY (base64 preferred; anything else is SHA-256'd to 32 bytes). */
function key(): Buffer {
  const raw = env.CALENDAR_TOKEN_KEY;
  if (!raw) throw new Error("CALENDAR_TOKEN_KEY is not set — cannot encrypt/decrypt calendar tokens.");
  const b = Buffer.from(raw, "base64");
  return b.length === 32 ? b : createHash("sha256").update(raw).digest();
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptToken(encoded: string): string {
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
