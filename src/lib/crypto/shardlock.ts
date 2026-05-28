import { decryptBytes, encryptBytes, exactArrayBuffer, fromBase64, toBase64, zeroBytes } from './aes';

export type ShardLockContentType = 'text' | 'walrus-file';

export interface GuardianEncryptionIdentity {
  walletAddress: `0x${string}`;
  publicKeyJwk: JsonWebKey;
  privateKeyJwk?: JsonWebKey;
  publicKeyId: string;
  signature: `0x${string}`;
  createdAt: number;
}

export interface EncryptedVaultArtifact {
  id: string;
  version: 1;
  ownerWallet: `0x${string}`;
  contentType: ShardLockContentType;
  payload: {
    algorithm: 'AES-256-GCM';
    ciphertext: string;
  };
  threshold: number;
  totalShards: number;
  shardRefs: ShardReference[];
  createdAt: number;
  updatedAt: number;
}

export interface ShardReference {
  shardId: string;
  guardianWallet: `0x${string}`;
  guardianPublicKeyId: string;
  shardIndex: number;
}

export interface EncryptedShardEnvelope extends ShardReference {
  vaultId: string;
  version: 1;
  algorithm: 'ECDH-P256-HKDF-SHA256-AES-256-GCM';
  ephemeralPublicKeyJwk: JsonWebKey;
  hkdfSalt: string;
  hkdfInfo: string;
  ciphertext: string;
  createdAt: number;
}

export interface ShardLockRecoveryEvent {
  vaultId: string;
  recoveredBy: `0x${string}`;
  recoveredAt: number;
}

export type SignShardLockMessage = (message: string) => Promise<`0x${string}`>;

export function createShardLockRegistrationMessage(params: {
  walletAddress: `0x${string}`;
  publicKeyId: string;
  publicKeyJwk: JsonWebKey;
}): string {
  return [
    'Nythera ShardLock Guardian Encryption Key',
    `Wallet: ${params.walletAddress.toLowerCase()}`,
    `Public Key ID: ${params.publicKeyId}`,
    `Public Key: ${canonicalJson(params.publicKeyJwk)}`,
  ].join('\n');
}

export async function createGuardianEncryptionIdentity(
  walletAddress: `0x${string}`,
  signMessage: SignShardLockMessage,
): Promise<GuardianEncryptionIdentity> {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const publicKeyId = await derivePublicKeyId(walletAddress, publicKeyJwk);
  const signature = await signMessage(createShardLockRegistrationMessage({
    walletAddress,
    publicKeyId,
    publicKeyJwk,
  }));

  return {
    walletAddress: walletAddress.toLowerCase() as `0x${string}`,
    publicKeyJwk,
    privateKeyJwk,
    publicKeyId,
    signature,
    createdAt: Date.now(),
  };
}

export async function encryptShardForGuardian(params: {
  vaultId: string;
  shardId: string;
  shardIndex: number;
  guardian: GuardianEncryptionIdentity;
  shard: Uint8Array<ArrayBufferLike>;
}): Promise<EncryptedShardEnvelope> {
  assertPublicGuardianIdentity(params.guardian);

  const ephemeral = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );
  const guardianPublicKey = await importPublicKey(params.guardian.publicKeyJwk);
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: guardianPublicKey },
    ephemeral.privateKey,
    256,
  ));
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const info = new TextEncoder().encode(
    `nythera:shardlock:v1:${params.vaultId}:${params.shardId}:${params.shardIndex}:${params.guardian.publicKeyId}`,
  );

  try {
    const key = await deriveShardAesKey(sharedSecret, salt, info);
    const ciphertext = await encryptBytes(params.shard, key);
    const ephemeralPublicKeyJwk = await crypto.subtle.exportKey('jwk', ephemeral.publicKey);
    const encodedCiphertext = toBase64(ciphertext);
    zeroBytes(ciphertext);

    return {
      vaultId: params.vaultId,
      version: 1,
      algorithm: 'ECDH-P256-HKDF-SHA256-AES-256-GCM',
      shardId: params.shardId,
      shardIndex: params.shardIndex,
      guardianWallet: params.guardian.walletAddress.toLowerCase() as `0x${string}`,
      guardianPublicKeyId: params.guardian.publicKeyId,
      ephemeralPublicKeyJwk,
      hkdfSalt: toBase64(salt),
      hkdfInfo: toBase64(info),
      ciphertext: encodedCiphertext,
      createdAt: Date.now(),
    };
  } finally {
    zeroBytes(sharedSecret);
    zeroBytes(salt);
    zeroBytes(info);
  }
}

export async function decryptGuardianShard(params: {
  envelope: EncryptedShardEnvelope;
  guardian: GuardianEncryptionIdentity;
}): Promise<Uint8Array> {
  assertPrivateGuardianIdentity(params.guardian);
  if (params.envelope.guardianPublicKeyId !== params.guardian.publicKeyId) {
    throw new Error('Guardian encryption identity does not match this shard.');
  }

  const privateKey = await importPrivateKey(params.guardian.privateKeyJwk);
  const ephemeralPublicKey = await importPublicKey(params.envelope.ephemeralPublicKeyJwk);
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: ephemeralPublicKey },
    privateKey,
    256,
  ));
  const salt = fromBase64(params.envelope.hkdfSalt);
  const info = fromBase64(params.envelope.hkdfInfo);
  const ciphertext = fromBase64(params.envelope.ciphertext);

  try {
    const key = await deriveShardAesKey(sharedSecret, salt, info);
    return decryptBytes(ciphertext, key);
  } finally {
    zeroBytes(sharedSecret);
    zeroBytes(salt);
    zeroBytes(info);
    zeroBytes(ciphertext);
  }
}

export async function derivePublicKeyId(
  walletAddress: `0x${string}`,
  publicKeyJwk: JsonWebKey,
): Promise<string> {
  const encoded = new TextEncoder().encode(`${walletAddress.toLowerCase()}:${canonicalJson(publicKeyJwk)}`);
  const digest = await crypto.subtle.digest('SHA-256', exactArrayBuffer(encoded));
  zeroBytes(encoded);
  return base64Url(new Uint8Array(digest));
}

function assertPublicGuardianIdentity(identity: GuardianEncryptionIdentity): void {
  if (!identity.publicKeyJwk || identity.publicKeyJwk.kty !== 'EC' || identity.publicKeyJwk.crv !== 'P-256') {
    throw new Error(`Guardian ${identity.walletAddress} is missing a ShardLock P-256 public key.`);
  }
  if (!identity.publicKeyId || !identity.signature) {
    throw new Error(`Guardian ${identity.walletAddress} has not registered a signed ShardLock public key.`);
  }
}

function assertPrivateGuardianIdentity(identity: GuardianEncryptionIdentity): asserts identity is GuardianEncryptionIdentity & { privateKeyJwk: JsonWebKey } {
  assertPublicGuardianIdentity(identity);
  if (!identity.privateKeyJwk) {
    throw new Error(`Guardian ${identity.walletAddress} is missing the local ShardLock private key.`);
  }
}

async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
}

async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits'],
  );
}

async function deriveShardAesKey(
  sharedSecret: Uint8Array<ArrayBufferLike>,
  salt: Uint8Array<ArrayBufferLike>,
  info: Uint8Array<ArrayBufferLike>,
): Promise<CryptoKey> {
  const hkdfKey = await crypto.subtle.importKey(
    'raw',
    exactArrayBuffer(sharedSecret),
    'HKDF',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: exactArrayBuffer(salt),
      info: exactArrayBuffer(info),
    },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function base64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
