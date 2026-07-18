import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { env } from "../env.js";

/**
 * AES-256-GCM token encryption for secrets stored at rest — the BYO-connect
 * per-org GitHub / Vercel tokens (docs/system.md §6) and any other stored
 * provider secret (the Google-calendar OAuth tokens use the SAME key).
 *
 * Key = `CALENDAR_TOKEN_KEY` (the AES key that already guards the calendar
 * tokens — env.ts §"Google Calendar sync"). Preferred form is a base64-encoded
 * 32-byte key; any other string is stretched to 32 bytes with scrypt (a fixed
 * salt keeps it deterministic) so an operator can paste an arbitrary secret and
 * it still works. Missing key → a clear throw the moment we actually encrypt or
 * decrypt (never at import), matching the ports that fail loudly only when
 * exercised.
 *
 * Ciphertext format: `v1:<iv>:<tag>:<ciphertext>`, each part base64. The 12-byte
 * IV is random per message; the GCM auth tag makes tampering / a wrong key fail
 * closed on decrypt.
 */

const ALGO = "aes-256-gcm";
const IV_BYTES = 12; // GCM standard nonce length
const KEY_BYTES = 32; // AES-256
const SCHEME = "v1";
/** Fixed salt so a non-base64 CALENDAR_TOKEN_KEY derives the SAME 32-byte key every time. */
const KDF_SALT = "lu-connect-token-v1";

/** Resolve the 32-byte AES key from CALENDAR_TOKEN_KEY (base64 32-byte → verbatim, else scrypt). */
function resolveKey(): Buffer {
  const raw = env.CALENDAR_TOKEN_KEY;
  if (!raw) {
    throw new Error(
      "CALENDAR_TOKEN_KEY is not set — required to encrypt/decrypt stored connection tokens at rest.",
    );
  }
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length === KEY_BYTES) return decoded;
  // Fallback: stretch any-length secret to 32 bytes deterministically.
  return scryptSync(raw, KDF_SALT, KEY_BYTES);
}

/** Encrypt a plaintext token → `v1:<iv>:<tag>:<ciphertext>` (all base64). */
export function encryptToken(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, resolveKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [SCHEME, iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

/** Decrypt a `v1:<iv>:<tag>:<ciphertext>` payload. Throws on a bad scheme / wrong key / tampering. */
export function decryptToken(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== SCHEME) {
    throw new Error("malformed encrypted token payload");
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = createDecipheriv(ALGO, resolveKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return dec.toString("utf8");
}

/**
 * Best-effort decrypt for read paths (store getters): returns the plaintext, or
 * `null` for an absent / undecryptable value (e.g. after a key rotation) rather
 * than throwing — so a status check or listing never crashes on one bad row. A
 * failure is logged; the token-consuming path then simply sees no usable token.
 */
export function decryptTokenSafe(payload: string | null | undefined): string | null {
  if (!payload) return null;
  try {
    return decryptToken(payload);
  } catch (err) {
    console.warn("[crypto] stored token decrypt failed:", (err as Error).message);
    return null;
  }
}
