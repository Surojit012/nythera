/**
 * High-Level Vault Operations
 *
 * Composes AES-GCM encryption + Shamir Secret Sharing into a single API.
 *
 * Flow:
 *   1. Generate random AES-256 key
 *   2. Encrypt seed phrase with AES-GCM → encrypted blob (IV + ciphertext)
 *   3. Export AES key → raw 32 bytes
 *   4. Split raw key via Shamir SSS → N shares
 *   5. Destroy original key
 *
 * Recovery:
 *   1. Collect ≥ threshold shares
 *   2. Reconstruct AES key from shares
 *   3. Decrypt blob → original seed phrase
 *   4. GCM auth tag validates integrity automatically
 */

import { generateKey, exportKey, importKey, encrypt, decrypt, encryptBytes, decryptBytes, toBase64, fromBase64, zeroBytes } from './aes';
import { splitSecret, combineShares, shareToHex, hexToShare } from './shamir';
import { accessSecretFromCDR, uploadSecretToCDR } from './cdr';
import {
  decryptGuardianShard,
  encryptShardForGuardian,
  type EncryptedVaultArtifact,
  type GuardianEncryptionIdentity,
  type ShardLockContentType,
  type ShardReference,
} from './shardlock';
import type { ShardLockStorageAdapter } from '../store/shardlock-store';
import type { CDRClient } from '@piplabs/cdr-sdk';
import type { PublicClient, WalletClient } from 'viem';
import type { WalrusFilePayload } from './file/walrus-file';

// ── Types ─────────────────────────────────────────────────

export interface GuardianConfig {
  address: string;
  label: string;
  delay: string; // e.g. '24h', '7d', '30d'
}

export interface ShardInfo {
  index: number;
  holder: string; // 'you' | guardian address
  label: string;  // display label
  shareHex: string;
}

export interface VaultData {
  id: string;
  name?: string;
  description?: string;
  tags?: string[];
  createdAt: number;
  ownerAddress: string;
  encryptedBlob: string; // base64 encoded (IV + ciphertext)
  totalShares: number;
  threshold: number;
  shards: ShardInfo[];
  guardians: GuardianConfig[];
  timelockDelay: string;
  // Mock external references
  ipfsCid: string;
  storyProtocolId: string;
  status: 'active' | 'locked' | 'recovering';
  cdr?: {
    uuid: number;
    allocateTxHash: `0x${string}`;
    writeTxHash: `0x${string}`;
    conditionVersion?: 'v1-storage-whitelist' | 'v2-encoded-access' | 'v3-origin-access';
    accessConditionAddress?: `0x${string}`;
    readConditionData?: `0x${string}`;
    writeConditionData?: `0x${string}`;
    accessAuxData?: `0x${string}`;
  };
  recipients?: {
    wallets: `0x${string}`[];
    emails: string[];
    resolvedEmailWallets: `0x${string}`[];
  };
  contentType?: 'text' | 'walrus-file';
  walrus?: Omit<WalrusFilePayload, 'encryptionKey' | 'iv' | 'type'>;
  recoveryEvents?: VaultRecoveryEvent[];
  recoverability?: {
    recoverable: boolean;
    reason?: string;
  };
}

export interface VaultRecoveryEvent {
  recoveredAt: number;
  recoveredBy: string;
  cdrUuid?: number;
  contentType?: 'text' | 'walrus-file';
}

export interface VaultCreationResult {
  vault: VaultData;
  userShare: string; // hex-encoded share for the user to keep
}

export interface CDRVaultCreateParams {
  client: CDRClient;
  publicClient: PublicClient;
  walletClient: WalletClient;
  recipientAddresses: `0x${string}`[];
  recipientEmails?: string[];
  resolvedEmailWallets?: `0x${string}`[];
  whitelistConditionAddress?: `0x${string}`;
  accessConditionAddress?: `0x${string}`;
  accessConditionVersion?: 'v2-encoded-access' | 'v3-origin-access';
  accessAuxData?: `0x${string}`;
  updatable?: boolean;
  timelockDelay?: string;
  contentType?: 'text' | 'walrus-file';
  walrus?: Omit<WalrusFilePayload, 'encryptionKey' | 'iv' | 'type'>;
  onProgress?: (stage: 'allocating' | 'registering' | 'encrypting' | 'writing') => void;
}

export interface CreateShardLockVaultParams {
  payload: Uint8Array | string;
  ownerWallet: `0x${string}`;
  guardianIdentities: GuardianEncryptionIdentity[];
  storageAdapter: ShardLockStorageAdapter;
  threshold?: number;
  contentType?: ShardLockContentType;
}

export interface RecoverShardLockVaultParams {
  vaultId: string;
  guardianPrivateIdentity: GuardianEncryptionIdentity | GuardianEncryptionIdentity[];
  selectedShardRefs: Array<string | ShardReference>;
  storageAdapter: ShardLockStorageAdapter;
  recoveredBy?: `0x${string}`;
}

// ── Vault Creation ────────────────────────────────────────

/**
 * Create a new vault: encrypt the seed phrase and split the AES key.
 *
 * @param seedPhrase   - The secret to protect
 * @param ownerAddress - The connected wallet address
 * @param guardians    - Guardian configurations
 * @param threshold    - Min shares needed to recover (including user's share)
 * @param timelockDelay - Inactivity trigger delay
 */
export async function createVault(
  seedPhrase: string,
  ownerAddress: string,
  guardians: GuardianConfig[],
  threshold: number,
  timelockDelay: string = '14d',
): Promise<VaultCreationResult> {
  const totalShares = guardians.length + 1; // +1 for user's own share

  if (threshold > totalShares) {
    throw new Error('Threshold cannot exceed total participants');
  }

  // 1. Generate AES-256 key
  const aesKey = await generateKey();

  // 2. Encrypt seed phrase
  const encryptedBlob = await encrypt(seedPhrase, aesKey);

  // 3. Export key to raw bytes
  const keyBytes = await exportKey(aesKey);

  // 4. Split key via Shamir
  const shares = await splitSecret(keyBytes, totalShares, threshold);
  zeroBytes(keyBytes);

  // 5. Build shard metadata
  const shards: ShardInfo[] = shares.map((share, i) => {
    const isUser = i === 0;
    return {
      index: i,
      holder: isUser ? 'you' : guardians[i - 1].address,
      label: isUser ? 'Your Shard' : guardians[i - 1].label,
      shareHex: shareToHex(share),
    };
  });

  // 6. Generate mock IDs for IPFS and Story Protocol
  const vaultId = `vault-${ownerAddress.slice(0, 6)}-${Date.now().toString(36)}`;
  const ipfsCid = `bafybeig${randomHex(44)}`;
  const storyProtocolId = `sp-${randomHex(16)}`;

  const vault: VaultData = {
    id: vaultId,
    createdAt: Date.now(),
    ownerAddress,
    encryptedBlob: toBase64(encryptedBlob),
    totalShares,
    threshold,
    shards: shards.map((s) => ({
      ...s,
      // Don't store actual share hex in the vault record for non-user shards
      shareHex: s.holder === 'you' ? s.shareHex : '',
    })),
    guardians,
    timelockDelay,
    ipfsCid,
    storyProtocolId,
    status: 'active',
  };

  return {
    vault,
    userShare: shards[0].shareHex,
  };
}

/**
 * Create a local ShardLock vault artifact without touching the current CDR flow.
 * The payload is encrypted with a random master key; the exported key bytes are
 * Shamir-split and each share is encrypted for a registered guardian identity.
 */
export async function createShardLockVault({
  payload,
  ownerWallet,
  guardianIdentities,
  storageAdapter,
  threshold = 2,
  contentType = 'text',
}: CreateShardLockVaultParams): Promise<EncryptedVaultArtifact> {
  validateShardLockGuardians(guardianIdentities, threshold);

  const vaultId = `sl-${ownerWallet.slice(0, 6)}-${Date.now().toString(36)}-${randomHex(6)}`;
  const createdAt = Date.now();
  const plaintext: Uint8Array = typeof payload === 'string' ? new TextEncoder().encode(payload) : Uint8Array.from(payload);
  const masterKey = await generateKey();
  const masterKeyBytes = await exportKey(masterKey);
  let payloadCiphertext: Uint8Array<ArrayBufferLike> = new Uint8Array();
  let shares: Uint8Array<ArrayBufferLike>[] = [];

  try {
    payloadCiphertext = await encryptBytes(plaintext, masterKey);
    shares = await splitSecret(masterKeyBytes, guardianIdentities.length, threshold);
    const shardRefs: ShardReference[] = [];

    await Promise.all(guardianIdentities.map((guardian) => storageAdapter.saveGuardianIdentity(guardian)));
    await Promise.all(shares.map(async (share, index) => {
      const guardian = guardianIdentities[index];
      const shardId = `${vaultId}-shard-${index + 1}-${randomHex(4)}`;
      const envelope = await encryptShardForGuardian({
        vaultId,
        shardId,
        shardIndex: index + 1,
        guardian,
        shard: share,
      });
      await storageAdapter.saveShardEnvelope(envelope);
      shardRefs.push({
        shardId,
        guardianWallet: envelope.guardianWallet,
        guardianPublicKeyId: envelope.guardianPublicKeyId,
        shardIndex: envelope.shardIndex,
      });
    }));

    const artifact: EncryptedVaultArtifact = {
      id: vaultId,
      version: 1,
      ownerWallet: ownerWallet.toLowerCase() as `0x${string}`,
      contentType,
      payload: {
        algorithm: 'AES-256-GCM',
        ciphertext: toBase64(payloadCiphertext),
      },
      threshold,
      totalShards: guardianIdentities.length,
      shardRefs: shardRefs.sort((a, b) => a.shardIndex - b.shardIndex),
      createdAt,
      updatedAt: createdAt,
    };

    await storageAdapter.saveVaultArtifact(artifact);
    return artifact;
  } finally {
    zeroBytes(plaintext);
    zeroBytes(masterKeyBytes);
    zeroBytes(payloadCiphertext);
    shares.forEach(zeroBytes);
  }
}

/**
 * Recover a ShardLock vault payload by decrypting enough guardian shards,
 * combining them with Shamir, and using AES-GCM auth as the integrity check.
 */
export async function recoverShardLockVault({
  vaultId,
  guardianPrivateIdentity,
  selectedShardRefs,
  storageAdapter,
  recoveredBy,
}: RecoverShardLockVaultParams): Promise<Uint8Array> {
  const artifact = await storageAdapter.getVaultArtifact(vaultId);
  if (!artifact) throw new Error('ShardLock vault artifact not found.');
  if (selectedShardRefs.length < artifact.threshold) {
    throw new Error(`Need at least ${artifact.threshold} ShardLock shards to recover this vault.`);
  }

  const identities = Array.isArray(guardianPrivateIdentity)
    ? guardianPrivateIdentity
    : [guardianPrivateIdentity];
  const shares: Uint8Array[] = [];
  const selected = selectedShardRefs.slice(0, artifact.threshold);
  let reconstructed: Uint8Array | null = null;

  try {
    for (const ref of selected) {
      const shardId = typeof ref === 'string' ? ref : ref.shardId;
      const envelope = await storageAdapter.getShardEnvelope(shardId);
      if (!envelope) throw new Error(`Shard envelope ${shardId} was not found.`);
      const identity = identities.find((candidate) => candidate.publicKeyId === envelope.guardianPublicKeyId);
      if (!identity) throw new Error(`No local ShardLock private key for guardian ${envelope.guardianWallet}.`);
      shares.push(await decryptGuardianShard({ envelope, guardian: identity }));
    }

    reconstructed = await combineShares(shares);
    const aesKey = await importKey(reconstructed, false);
    const plaintext = await decryptBytes(fromBase64(artifact.payload.ciphertext), aesKey);
    zeroBytes(reconstructed);

    await storageAdapter.recordRecoveryEvent({
      vaultId,
      recoveredBy: recoveredBy ?? identities[0].walletAddress,
      recoveredAt: Date.now(),
    });

    return plaintext;
  } finally {
    zeroBytes(reconstructed);
    shares.forEach(zeroBytes);
  }
}

// ── Vault Recovery ────────────────────────────────────────

/**
 * Recover a seed phrase from collected shares and the encrypted blob.
 *
 * @param encryptedBlobB64 - Base64-encoded encrypted blob from vault data
 * @param shareHexStrings  - Array of hex-encoded shares (at least `threshold` count)
 * @returns The decrypted seed phrase
 * @throws Error if shares are insufficient or wrong (GCM auth tag fails)
 */
export async function recoverVault(
  encryptedBlobB64: string,
  shareHexStrings: string[],
): Promise<string> {
  const shares = shareHexStrings.map(hexToShare);
  let keyBytes: Uint8Array<ArrayBufferLike> | null = null;

  try {
    keyBytes = await combineShares(shares);

    const aesKey = await importKey(keyBytes, false);
    const encryptedBlob = fromBase64(encryptedBlobB64);

    return await decrypt(encryptedBlob, aesKey);
  } finally {
    zeroBytes(keyBytes);
    shares.forEach(zeroBytes);
  }
}

/**
 * Create a vault backed by Story CDR threshold encryption.
 * This bypasses local AES+Shamir splitting and stores the secret in a CDR vault.
 */
export async function createVaultWithCDR(
  secretPayload: string,
  ownerAddress: string,
  guardians: GuardianConfig[],
  params: CDRVaultCreateParams,
): Promise<VaultCreationResult> {
  const { uuid, txHashes, access } = await uploadSecretToCDR({
    client: params.client,
    publicClient: params.publicClient,
    walletClient: params.walletClient,
    ownerAddress: ownerAddress as `0x${string}`,
    secret: secretPayload,
    recipientAddresses: params.recipientAddresses,
    accessAuxData: params.accessAuxData ?? '0x',
    updatable: params.updatable ?? false,
    whitelistConditionAddress: params.whitelistConditionAddress,
    accessConditionAddress: params.accessConditionAddress,
    accessConditionVersion: params.accessConditionVersion,
    onProgress: params.onProgress,
  });

  const vaultId = `vault-${ownerAddress.slice(0, 6)}-${Date.now().toString(36)}`;
  const storyProtocolId = `sp-cdr-${uuid}`;

  const vault: VaultData = {
    id: vaultId,
    createdAt: Date.now(),
    ownerAddress,
    encryptedBlob: '',
    totalShares: 0,
    threshold: 0,
    shards: [],
    guardians,
    timelockDelay: params.timelockDelay ?? '14d',
    ipfsCid: '',
    storyProtocolId,
    status: 'active',
    recipients: {
      wallets: params.recipientAddresses,
      emails: params.recipientEmails ?? [],
      resolvedEmailWallets: params.resolvedEmailWallets ?? [],
    },
    contentType: params.contentType ?? 'text',
    walrus: params.walrus,
    cdr: {
      uuid,
      allocateTxHash: txHashes.allocate,
      writeTxHash: txHashes.write,
      conditionVersion: access.conditionVersion,
      accessConditionAddress: access.conditionAddress,
      readConditionData: access.readConditionData,
      writeConditionData: access.writeConditionData,
      accessAuxData: access.accessAuxData,
    },
  };

  return {
    vault,
    userShare: '',
  };
}

/**
 * Recover a CDR-backed vault by reading and decrypting through Story's validator network.
 */
export async function recoverVaultWithCDR(
  vault: VaultData,
  client: CDRClient,
  accessAuxData: `0x${string}` = '0x',
): Promise<string> {
  if (!vault.cdr) {
    throw new Error('Vault does not contain CDR metadata');
  }

  return accessSecretFromCDR({
    client,
    uuid: vault.cdr.uuid,
    accessAuxData,
  });
}

// ── Helpers ───────────────────────────────────────────────

function randomHex(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(Math.ceil(length / 2)));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length);
}

function validateShardLockGuardians(
  guardianIdentities: GuardianEncryptionIdentity[],
  threshold: number,
): void {
  if (guardianIdentities.length < 2) {
    throw new Error('ShardLock vaults require at least 2 registered guardian encryption keys.');
  }
  if (threshold < 2) {
    throw new Error('ShardLock threshold must be at least 2.');
  }
  if (threshold > guardianIdentities.length) {
    throw new Error('ShardLock threshold cannot exceed the number of guardian keys.');
  }

  const seen = new Set<string>();
  for (const guardian of guardianIdentities) {
    if (!guardian.publicKeyJwk || !guardian.publicKeyId || !guardian.signature) {
      throw new Error(`Guardian ${guardian.walletAddress} is missing a registered ShardLock public key.`);
    }
    const key = `${guardian.walletAddress.toLowerCase()}:${guardian.publicKeyId}`;
    if (seen.has(key)) {
      throw new Error(`Duplicate ShardLock guardian key for ${guardian.walletAddress}.`);
    }
    seen.add(key);
  }
}
