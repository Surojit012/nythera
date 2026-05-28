/**
 * Shamir Secret Sharing Wrapper
 *
 * Wraps the `shamir-secret-sharing` library (audited by Cure53 + Zellic).
 * Operates entirely on Uint8Array — ideal for splitting AES-256 key bytes.
 *
 * IMPORTANT: combine() does NOT verify integrity. If wrong shares are provided,
 * it returns garbage bytes. The AES-GCM auth tag check during decryption
 * will catch this and throw an error — that's the integrity verification layer.
 */

import { split as shamirSplit, combine as shamirCombine } from 'shamir-secret-sharing';

/**
 * Split a secret (key bytes) into N shares with a threshold of M.
 * @param secret  - The raw bytes to split (e.g. a 32-byte AES key)
 * @param shares  - Total number of shares to generate
 * @param threshold - Minimum shares needed to reconstruct
 * @returns Array of Uint8Array shares
 */
export async function splitSecret(
  secret: Uint8Array,
  shares: number,
  threshold: number,
): Promise<Uint8Array[]> {
  if (threshold > shares) {
    throw new Error(`Threshold (${threshold}) cannot exceed total shares (${shares})`);
  }
  if (threshold < 2) {
    throw new Error('Threshold must be at least 2');
  }
  if (shares < 2) {
    throw new Error('Must generate at least 2 shares');
  }

  return shamirSplit(secret, shares, threshold);
}

/**
 * Reconstruct a secret from a subset of shares.
 * Requires at least `threshold` shares (from the original split).
 *
 * WARNING: Does not verify integrity — returns garbage if wrong shares are given.
 * Use AES-GCM decryption as the integrity check.
 */
export async function combineShares(
  shares: Uint8Array[],
): Promise<Uint8Array> {
  if (shares.length < 2) {
    throw new Error('Need at least 2 shares to reconstruct');
  }

  return shamirCombine(shares);
}

// ── Share encoding helpers (for display / copy-paste) ────────

/** Encode a share (Uint8Array) to a hex string for user-friendly display. */
export function shareToHex(share: Uint8Array): string {
  return Array.from(share)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Decode a hex string back to a Uint8Array share. */
export function hexToShare(hex: string): Uint8Array {
  const clean = hex.replace(/\s/g, '').toLowerCase();
  if (clean.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}
