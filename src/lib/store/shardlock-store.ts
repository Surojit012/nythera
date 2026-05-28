import type {
  EncryptedShardEnvelope,
  EncryptedVaultArtifact,
  GuardianEncryptionIdentity,
  ShardLockRecoveryEvent,
} from '../crypto/shardlock';

export interface ShardLockStorageAdapter {
  saveGuardianIdentity(identity: GuardianEncryptionIdentity): Promise<void>;
  getGuardianIdentity(walletAddress: `0x${string}`, publicKeyId?: string): Promise<GuardianEncryptionIdentity | null>;
  listGuardianIdentities(walletAddress?: `0x${string}`): Promise<GuardianEncryptionIdentity[]>;
  saveVaultArtifact(artifact: EncryptedVaultArtifact): Promise<void>;
  getVaultArtifact(vaultId: string): Promise<EncryptedVaultArtifact | null>;
  saveShardEnvelope(envelope: EncryptedShardEnvelope): Promise<void>;
  getShardEnvelope(shardId: string): Promise<EncryptedShardEnvelope | null>;
  listShardEnvelopes(vaultId: string): Promise<EncryptedShardEnvelope[]>;
  recordRecoveryEvent(event: ShardLockRecoveryEvent): Promise<void>;
  listRecoveryEvents(vaultId: string): Promise<ShardLockRecoveryEvent[]>;
}

type ShardLockStorageState = {
  guardianIdentities: GuardianEncryptionIdentity[];
  vaults: EncryptedVaultArtifact[];
  shards: EncryptedShardEnvelope[];
  recoveryEvents: ShardLockRecoveryEvent[];
};

const STORAGE_KEY = 'nythera_shardlock_v1';

export class LocalShardLockStorageAdapter implements ShardLockStorageAdapter {
  async saveGuardianIdentity(identity: GuardianEncryptionIdentity): Promise<void> {
    const state = readState();
    const walletAddress = identity.walletAddress.toLowerCase();
    state.guardianIdentities = [
      ...state.guardianIdentities.filter(
        (entry) => !(entry.walletAddress.toLowerCase() === walletAddress && entry.publicKeyId === identity.publicKeyId),
      ),
      publicIdentity(identity),
    ];
    writeState(state);
  }

  async getGuardianIdentity(
    walletAddress: `0x${string}`,
    publicKeyId?: string,
  ): Promise<GuardianEncryptionIdentity | null> {
    const wallet = walletAddress.toLowerCase();
    return readState().guardianIdentities.find((identity) => {
      if (identity.walletAddress.toLowerCase() !== wallet) return false;
      return publicKeyId ? identity.publicKeyId === publicKeyId : true;
    }) ?? null;
  }

  async listGuardianIdentities(walletAddress?: `0x${string}`): Promise<GuardianEncryptionIdentity[]> {
    const identities = readState().guardianIdentities;
    if (!walletAddress) return identities;
    const wallet = walletAddress.toLowerCase();
    return identities.filter((identity) => identity.walletAddress.toLowerCase() === wallet);
  }

  async saveVaultArtifact(artifact: EncryptedVaultArtifact): Promise<void> {
    const state = readState();
    state.vaults = [
      ...state.vaults.filter((entry) => entry.id !== artifact.id),
      artifact,
    ];
    writeState(state);
  }

  async getVaultArtifact(vaultId: string): Promise<EncryptedVaultArtifact | null> {
    return readState().vaults.find((artifact) => artifact.id === vaultId) ?? null;
  }

  async saveShardEnvelope(envelope: EncryptedShardEnvelope): Promise<void> {
    const state = readState();
    state.shards = [
      ...state.shards.filter((entry) => entry.shardId !== envelope.shardId),
      envelope,
    ];
    writeState(state);
  }

  async getShardEnvelope(shardId: string): Promise<EncryptedShardEnvelope | null> {
    return readState().shards.find((envelope) => envelope.shardId === shardId) ?? null;
  }

  async listShardEnvelopes(vaultId: string): Promise<EncryptedShardEnvelope[]> {
    return readState().shards.filter((envelope) => envelope.vaultId === vaultId);
  }

  async recordRecoveryEvent(event: ShardLockRecoveryEvent): Promise<void> {
    const state = readState();
    state.recoveryEvents = [event, ...state.recoveryEvents];
    writeState(state);
  }

  async listRecoveryEvents(vaultId: string): Promise<ShardLockRecoveryEvent[]> {
    return readState().recoveryEvents.filter((event) => event.vaultId === vaultId);
  }
}

export class MemoryShardLockStorageAdapter implements ShardLockStorageAdapter {
  private state = emptyState();

  async saveGuardianIdentity(identity: GuardianEncryptionIdentity): Promise<void> {
    const walletAddress = identity.walletAddress.toLowerCase();
    this.state.guardianIdentities = [
      ...this.state.guardianIdentities.filter(
        (entry) => !(entry.walletAddress.toLowerCase() === walletAddress && entry.publicKeyId === identity.publicKeyId),
      ),
      publicIdentity(identity),
    ];
  }

  async getGuardianIdentity(
    walletAddress: `0x${string}`,
    publicKeyId?: string,
  ): Promise<GuardianEncryptionIdentity | null> {
    const wallet = walletAddress.toLowerCase();
    return this.state.guardianIdentities.find((identity) => {
      if (identity.walletAddress.toLowerCase() !== wallet) return false;
      return publicKeyId ? identity.publicKeyId === publicKeyId : true;
    }) ?? null;
  }

  async listGuardianIdentities(walletAddress?: `0x${string}`): Promise<GuardianEncryptionIdentity[]> {
    if (!walletAddress) return [...this.state.guardianIdentities];
    const wallet = walletAddress.toLowerCase();
    return this.state.guardianIdentities.filter((identity) => identity.walletAddress.toLowerCase() === wallet);
  }

  async saveVaultArtifact(artifact: EncryptedVaultArtifact): Promise<void> {
    this.state.vaults = [
      ...this.state.vaults.filter((entry) => entry.id !== artifact.id),
      artifact,
    ];
  }

  async getVaultArtifact(vaultId: string): Promise<EncryptedVaultArtifact | null> {
    return this.state.vaults.find((artifact) => artifact.id === vaultId) ?? null;
  }

  async saveShardEnvelope(envelope: EncryptedShardEnvelope): Promise<void> {
    this.state.shards = [
      ...this.state.shards.filter((entry) => entry.shardId !== envelope.shardId),
      envelope,
    ];
  }

  async getShardEnvelope(shardId: string): Promise<EncryptedShardEnvelope | null> {
    return this.state.shards.find((envelope) => envelope.shardId === shardId) ?? null;
  }

  async listShardEnvelopes(vaultId: string): Promise<EncryptedShardEnvelope[]> {
    return this.state.shards.filter((envelope) => envelope.vaultId === vaultId);
  }

  async recordRecoveryEvent(event: ShardLockRecoveryEvent): Promise<void> {
    this.state.recoveryEvents = [event, ...this.state.recoveryEvents];
  }

  async listRecoveryEvents(vaultId: string): Promise<ShardLockRecoveryEvent[]> {
    return this.state.recoveryEvents.filter((event) => event.vaultId === vaultId);
  }

  dumpSerializableState(): ShardLockStorageState {
    return JSON.parse(JSON.stringify(this.state)) as ShardLockStorageState;
  }
}

function readState(): ShardLockStorageState {
  if (typeof window === 'undefined') return emptyState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...emptyState(), ...JSON.parse(raw) as Partial<ShardLockStorageState> } : emptyState();
  } catch {
    return emptyState();
  }
}

function writeState(state: ShardLockStorageState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function emptyState(): ShardLockStorageState {
  return {
    guardianIdentities: [],
    vaults: [],
    shards: [],
    recoveryEvents: [],
  };
}

function publicIdentity(identity: GuardianEncryptionIdentity): GuardianEncryptionIdentity {
  return {
    walletAddress: identity.walletAddress.toLowerCase() as `0x${string}`,
    publicKeyJwk: identity.publicKeyJwk,
    publicKeyId: identity.publicKeyId,
    signature: identity.signature,
    createdAt: identity.createdAt,
  };
}
