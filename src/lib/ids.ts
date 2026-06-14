import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Security-critical identifier helpers.
 *
 * `randomToken` returns a URL-safe, base64url-encoded string carrying at least
 * 128 bits of entropy (US-3.3 AC-1/AC-5: media publicIds, share-link tokens,
 * invitation tokens, email tokens, and raw session tokens are all non-guessable).
 * 16 bytes = 128 bits of randomness.
 */
export function randomToken(bytes = 16): string {
  return randomBytes(bytes).toString("base64url");
}

/** Entropy in bits for a token of `bytes` length. Used by tests to assert >=128. */
export function tokenEntropyBits(bytes = 16): number {
  return bytes * 8;
}

/** SHA-256 hex digest of a buffer/string. Used for content-addressing + session token hashing. */
export function sha256Hex(input: Buffer | string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Content-addressed storage key for a media blob (US-1.2 AC-13). Never exposed to clients. */
export function storageKeyForChecksum(checksumSha256: string): string {
  return `sha256/${checksumSha256}`;
}

/** Constant-time compare of two hex/base64 strings (token verification). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
