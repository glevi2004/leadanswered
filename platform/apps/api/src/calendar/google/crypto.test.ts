import { describe, it, expect } from "vitest";
import { env } from "../../env.js";
import { encryptToken, decryptToken } from "./crypto.js";

// key() reads env at call time, so set a deterministic 32-byte key before the tests run.
env.CALENDAR_TOKEN_KEY = Buffer.alloc(32, 7).toString("base64");

describe("calendar token crypto (AES-256-GCM)", () => {
  it("round-trips and never stores plaintext", () => {
    const secret = "1//0abc-refresh-token-XYZ";
    const enc = encryptToken(secret);
    expect(enc).not.toContain(secret);
    expect(decryptToken(enc)).toBe(secret);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    expect(encryptToken("same")).not.toBe(encryptToken("same"));
  });

  it("rejects tampered ciphertext (auth tag fails)", () => {
    const enc = encryptToken("x");
    const tampered = Buffer.from(enc, "base64");
    tampered[tampered.length - 1] ^= 1; // flip a ciphertext bit
    expect(() => decryptToken(tampered.toString("base64"))).toThrow();
  });
});
