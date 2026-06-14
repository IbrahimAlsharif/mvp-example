import { storageKeyForChecksum } from "@/lib/ids";

/**
 * Derive the content-addressed storage key for a media blob. Two uploads of the
 * same bytes resolve to the same key, which (with the Media @@unique constraint)
 * guarantees exactly one stored blob per item (US-1.2 AC-13).
 *
 * Storage keys are internal only and must never appear in any client response
 * (US-3.3): clients reference media solely by the non-guessable publicId.
 */
export function deriveStorageKey(checksumSha256: string): string {
  return storageKeyForChecksum(checksumSha256);
}
