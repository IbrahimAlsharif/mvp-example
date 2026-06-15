/**
 * Profile identity helpers — turn an account into the human-facing identity
 * shown in the UI (a display name + a stable placeholder avatar).
 *
 * The account model has no required name, so the display name falls back to a
 * prettified email local-part (e.g. "journey.test.0615" -> "Journey Test 0615").
 * We never render the raw email as the identity.
 */

/** Number of bundled placeholder avatars in /public/avatars (avatar-1..N.svg). */
export const AVATAR_COUNT = 6;

/**
 * Human-facing display name for an account.
 * Prefers an explicit displayName; otherwise prettifies the email local-part by
 * splitting on . _ - and digits-boundaries and title-casing each word.
 */
export function displayNameFor(account: { displayName?: string | null; email: string }): string {
  const explicit = account.displayName?.trim();
  if (explicit) return explicit;

  const local = account.email.split("@")[0] ?? account.email;
  const pretty = local
    .replace(/[._-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");

  return pretty || local;
}

/**
 * Stable placeholder avatar URL for an account. Deterministic in the account id
 * (or email) so the same user always gets the same face, with no external call.
 */
export function avatarUrlFor(account: { id?: string | null; email: string }): string {
  const seed = account.id || account.email;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const idx = (Math.abs(hash) % AVATAR_COUNT) + 1;
  return `/avatars/avatar-${idx}.svg`;
}
