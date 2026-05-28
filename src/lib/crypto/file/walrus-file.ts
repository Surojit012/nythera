import { fromHex, toHex } from 'viem';

export const MAX_WALRUS_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_WALRUS_FILE_LABEL = '4MB';

export interface EncryptedFileForWalrus {
  ciphertext: Uint8Array;
  encryptionKey: `0x${string}`;
  iv: `0x${string}`;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface WalrusFilePayload {
  type: 'walrus-file';
  blobId: string;
  objectId?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  encryptionKey: `0x${string}`;
  iv: `0x${string}`;
  endEpoch?: number;
  endDate?: string;
  renewalMode: 'notify' | 'autoRenew';
  note?: string;
}

export function isWalrusFilePayload(value: unknown): value is WalrusFilePayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<WalrusFilePayload>;
  return (
    payload.type === 'walrus-file' &&
    typeof payload.blobId === 'string' &&
    typeof payload.fileName === 'string' &&
    typeof payload.fileSize === 'number' &&
    typeof payload.mimeType === 'string' &&
    typeof payload.encryptionKey === 'string' &&
    typeof payload.iv === 'string'
  );
}

export function parseWalrusFilePayload(secret: string): WalrusFilePayload | null {
  try {
    const parsed = JSON.parse(secret) as unknown;
    return isWalrusFilePayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function encryptFileForWalrus(file: File): Promise<EncryptedFileForWalrus> {
  if (file.size > MAX_WALRUS_FILE_BYTES) {
    throw new Error(`File must be under ${MAX_WALRUS_FILE_LABEL} for this vault version.`);
  }

  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', exactArrayBuffer(keyBytes), 'AES-GCM', false, ['encrypt']);
  const plaintext = await file.arrayBuffer();
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: exactArrayBuffer(iv) }, key, plaintext);

  return {
    ciphertext: new Uint8Array(encrypted),
    encryptionKey: toHex(keyBytes),
    iv: toHex(iv),
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream',
  };
}

export async function decryptWalrusFile(
  payload: WalrusFilePayload,
  ciphertext: ArrayBuffer,
): Promise<Blob> {
  const keyBytes = fromHex(payload.encryptionKey, 'bytes');
  const iv = fromHex(payload.iv, 'bytes');
  const key = await crypto.subtle.importKey('raw', exactArrayBuffer(keyBytes), 'AES-GCM', false, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: exactArrayBuffer(iv) }, key, ciphertext);
  return new Blob([plaintext], { type: payload.mimeType || 'application/octet-stream' });
}

export function exactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
