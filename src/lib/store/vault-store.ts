/**
 * Vault Store — localStorage Persistence
 *
 * Stores vault metadata in the browser's localStorage.
 * Keyed by wallet address so each user sees only their own vaults.
 *
 * SECURITY: Never stores AES keys or plaintext secrets.
 * Only stores: vault ID, encrypted blob, shard metadata, guardian info, timestamps.
 */

import type { VaultData, GuardianConfig, VaultRecoveryEvent } from '../crypto/vault';

const STORAGE_KEY_PREFIX = 'nythera_vaults_';

function getStorageKey(walletAddress: string): string {
  return `${STORAGE_KEY_PREFIX}${walletAddress.toLowerCase()}`;
}

/** Get all vaults for a given wallet address. */
export function getVaults(walletAddress: string): VaultData[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(getStorageKey(walletAddress));
    if (!raw) return [];
    return JSON.parse(raw) as VaultData[];
  } catch {
    return [];
  }
}

/** Get a single vault by ID. */
export function getVault(walletAddress: string, vaultId: string): VaultData | null {
  const vaults = getVaults(walletAddress);
  return vaults.find((v) => v.id === vaultId) ?? null;
}

function persistVaults(walletAddress: string, vaults: VaultData[]): void {
  localStorage.setItem(getStorageKey(walletAddress), JSON.stringify(vaults));
}

/** Save a vault, replacing an older cached copy with the same ID. */
export function saveVault(walletAddress: string, vault: VaultData): void {
  if (typeof window === 'undefined') return;

  const vaults = getVaults(walletAddress);
  const index = vaults.findIndex((cachedVault) => cachedVault.id === vault.id);
  if (index === -1) {
    vaults.push(vault);
  } else {
    vaults[index] = vault;
  }
  persistVaults(walletAddress, vaults);
}

/** Merge durable vault records into the browser cache. */
export function mergeVaults(walletAddress: string, incomingVaults: VaultData[]): VaultData[] {
  if (typeof window === 'undefined') return [];

  const merged = new Map<string, VaultData>();
  for (const vault of getVaults(walletAddress)) {
    merged.set(vault.id, vault);
  }

  for (const incomingVault of incomingVaults) {
    const cachedVault = merged.get(incomingVault.id);
    merged.set(incomingVault.id, {
      ...incomingVault,
      recoveryEvents: incomingVault.recoveryEvents?.length
        ? incomingVault.recoveryEvents
        : cachedVault?.recoveryEvents,
    });
  }

  const vaults = [...merged.values()].sort((a, b) => b.createdAt - a.createdAt);
  persistVaults(walletAddress, vaults);
  return vaults;
}

/** Replace the browser cache with a reconciled vault list. */
export function replaceVaults(walletAddress: string, incomingVaults: VaultData[]): VaultData[] {
  if (typeof window === 'undefined') return [];

  const cachedById = new Map(getVaults(walletAddress).map((vault) => [vault.id, vault]));
  const vaults = incomingVaults
    .map((incomingVault) => {
      const cachedVault = cachedById.get(incomingVault.id);
      return {
        ...incomingVault,
        recoveryEvents: incomingVault.recoveryEvents?.length
          ? incomingVault.recoveryEvents
          : cachedVault?.recoveryEvents,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  persistVaults(walletAddress, vaults);
  return vaults;
}

/** Update an existing vault (matched by ID). */
export function updateVault(walletAddress: string, updatedVault: VaultData): void {
  if (typeof window === 'undefined') return;

  const vaults = getVaults(walletAddress);
  const index = vaults.findIndex((v) => v.id === updatedVault.id);
  if (index === -1) return;

  vaults[index] = updatedVault;
  persistVaults(walletAddress, vaults);
}

/** Append a successful recovery event to a vault. */
export function recordVaultRecovery(
  walletAddress: string,
  vaultId: string,
  event: VaultRecoveryEvent,
): VaultData | null {
  if (typeof window === 'undefined') return null;

  const vault = getVault(walletAddress, vaultId);
  if (!vault) return null;

  const updatedVault: VaultData = {
    ...vault,
    recoveryEvents: [event, ...(vault.recoveryEvents ?? [])],
  };
  updateVault(walletAddress, updatedVault);
  return updatedVault;
}

/** Update guardians for a specific vault. */
export function updateGuardians(
  walletAddress: string,
  vaultId: string,
  guardians: GuardianConfig[],
): void {
  const vault = getVault(walletAddress, vaultId);
  if (!vault) return;

  vault.guardians = guardians;
  updateVault(walletAddress, vault);
}

/** Delete a vault by ID. */
export function deleteVault(walletAddress: string, vaultId: string): void {
  if (typeof window === 'undefined') return;

  const vaults = getVaults(walletAddress);
  const filtered = vaults.filter((v) => v.id !== vaultId);
  persistVaults(walletAddress, filtered);
}

/** Delete all vaults for a wallet. */
export function deleteAllVaults(walletAddress: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(getStorageKey(walletAddress));
}

/** Get total vault count for a wallet. */
export function getVaultCount(walletAddress: string): number {
  return getVaults(walletAddress).length;
}
