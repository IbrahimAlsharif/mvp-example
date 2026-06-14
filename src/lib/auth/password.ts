import argon2 from "argon2";

/**
 * Password hashing with argon2id (industry-standard, memory-hard salted hash;
 * US-0.1 NFR). Salt is generated and embedded by argon2 automatically.
 */
export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}
