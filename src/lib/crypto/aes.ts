/**
 * AES-GCM Encryption Module
 *
 * Uses the native Web Crypto API for AES-256-GCM encryption.
 * All operations happen client-side — no data ever leaves the browser.
 *
 * IV (12 bytes) is prepended to the ciphertext for storage convenience.
 * GCM auth tag is automatically appended by Web Crypto.
 */

/** Generate a random AES-256-GCM key. Extractable so we can export for Shamir splitting. */
export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable — required for exportKey
    ['encrypt', 'decrypt'],
  );
}

/** Export a CryptoKey to raw bytes (32 bytes / 256 bits). */
export async function exportKey(key: CryptoKey): Promise<Uint8Array> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(raw);
}

/** Import raw key bytes back into a CryptoKey. */
export async function importKey(
  keyBytes: Uint8Array<ArrayBufferLike>,
  extractable = false,
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    exactArrayBuffer(keyBytes),
    { name: 'AES-GCM' },
    extractable,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt plaintext string using AES-GCM.
 * Returns a single Uint8Array with the 12-byte IV prepended to the ciphertext.
 */
export async function encrypt(
  plaintext: string,
  key: CryptoKey,
): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(plaintext);
  try {
    return await encryptBytes(encoded, key);
  } finally {
    zeroBytes(encoded);
  }
}

/**
 * Decrypt a combined blob (IV + ciphertext) back to plaintext.
 * Throws if the key is wrong — GCM auth tag verification will fail.
 */
export async function decrypt(
  combined: Uint8Array,
  key: CryptoKey,
): Promise<string> {
  const decrypted = await decryptBytes(combined, key);
  try {
    return new TextDecoder().decode(decrypted);
  } finally {
    zeroBytes(decrypted);
  }
}

/** Encrypt bytes using AES-GCM. Returns IV prepended to ciphertext. */
export async function encryptBytes(
  plaintext: Uint8Array<ArrayBufferLike>,
  key: CryptoKey,
): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: exactArrayBuffer(iv) },
    key,
    exactArrayBuffer(plaintext),
  );

  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);

  return combined;
}

/** Decrypt an AES-GCM blob with IV prepended to ciphertext. */
export async function decryptBytes(
  combined: Uint8Array<ArrayBufferLike>,
  key: CryptoKey,
): Promise<Uint8Array> {
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: exactArrayBuffer(iv) },
    key,
    exactArrayBuffer(ciphertext),
  );

  return new Uint8Array(decrypted);
}

// ── Encoding helpers ──────────────────────────────────────

/** Encode a Uint8Array to a base64 string (safe for JSON / localStorage). */
export function toBase64(bytes: Uint8Array<ArrayBufferLike>): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Decode a base64 string back to Uint8Array. */
export function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function zeroBytes(bytes: Uint8Array<ArrayBufferLike> | null | undefined): void {
  bytes?.fill(0);
}

export function exactArrayBuffer(bytes: Uint8Array<ArrayBufferLike>): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
