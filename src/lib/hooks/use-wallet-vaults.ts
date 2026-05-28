'use client';

import { useCallback, useEffect, useState } from 'react';
import type { VaultData } from '@/lib/crypto/vault';
import { getVaults, replaceVaults } from '@/lib/store/vault-store';

type UseWalletVaultsOptions = {
  cdrOnly?: boolean;
  recoverableOnly?: boolean;
};

type VaultRecordsResponse = {
  ok?: boolean;
  skipped?: boolean;
  vaults?: VaultData[];
  error?: string;
};

function filterVaults(vaults: VaultData[], options: UseWalletVaultsOptions): VaultData[] {
  return vaults.filter((vault) => {
    if (options.cdrOnly && !vault.cdr) return false;
    if (options.recoverableOnly && vault.recoverability?.recoverable === false) return false;
    return true;
  });
}

function reconcileSyncedVaults(localVaults: VaultData[], remoteVaults: VaultData[], skipped?: boolean): VaultData[] {
  if (skipped) return localVaults;

  const remoteIds = new Set(remoteVaults.map((vault) => vault.id));
  const recentLocalCdrCutoff = Date.now() - 10 * 60 * 1000;
  const localOnlyVaults = localVaults.filter((vault) => {
    if (!vault.cdr) return true;
    if (remoteIds.has(vault.id)) return false;
    return vault.createdAt > recentLocalCdrCutoff;
  });

  return [...remoteVaults, ...localOnlyVaults].sort((a, b) => b.createdAt - a.createdAt);
}

export function useWalletVaults(walletAddress?: string, options: UseWalletVaultsOptions = {}) {
  const [vaults, setVaults] = useState<VaultData[]>([]);
  const [hydrating, setHydrating] = useState(false);
  const [hydrateError, setHydrateError] = useState('');
  const cdrOnly = Boolean(options.cdrOnly);
  const recoverableOnly = Boolean(options.recoverableOnly);

  const refreshVaults = useCallback(async () => {
    if (!walletAddress) {
      setVaults([]);
      setHydrating(false);
      setHydrateError('');
      return;
    }

    const localVaults = getVaults(walletAddress);
    setVaults(filterVaults(localVaults, { cdrOnly, recoverableOnly }));
    setHydrating(true);
    setHydrateError('');

    try {
      const response = await fetch(`/api/vault-records?wallet=${encodeURIComponent(walletAddress)}`);
      const body = (await response.json().catch(() => ({}))) as VaultRecordsResponse;
      if (!response.ok && !body.skipped) {
        throw new Error(body.error ?? `Could not sync vault records (${response.status})`);
      }

      const remoteVaults = body.vaults ?? [];
      const syncedVaults = reconcileSyncedVaults(getVaults(walletAddress), remoteVaults, body.skipped);
      const mergedVaults = replaceVaults(walletAddress, syncedVaults);
      setVaults(filterVaults(mergedVaults, { cdrOnly, recoverableOnly }));
    } catch (error) {
      setHydrateError(error instanceof Error ? error.message : 'Could not sync vault records.');
      setVaults(filterVaults(getVaults(walletAddress), { cdrOnly, recoverableOnly }));
    } finally {
      setHydrating(false);
    }
  }, [cdrOnly, recoverableOnly, walletAddress]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (!walletAddress) {
        setVaults([]);
        setHydrating(false);
        setHydrateError('');
        return;
      }

      const localVaults = getVaults(walletAddress);
      if (!cancelled) {
        setVaults(filterVaults(localVaults, { cdrOnly, recoverableOnly }));
        setHydrating(true);
        setHydrateError('');
      }

      try {
        const response = await fetch(`/api/vault-records?wallet=${encodeURIComponent(walletAddress)}`);
        const body = (await response.json().catch(() => ({}))) as VaultRecordsResponse;
        if (!response.ok && !body.skipped) {
          throw new Error(body.error ?? `Could not sync vault records (${response.status})`);
        }

        const remoteVaults = body.vaults ?? [];
        const syncedVaults = reconcileSyncedVaults(getVaults(walletAddress), remoteVaults, body.skipped);
        const mergedVaults = replaceVaults(walletAddress, syncedVaults);
        if (!cancelled) setVaults(filterVaults(mergedVaults, { cdrOnly, recoverableOnly }));
      } catch (error) {
        if (!cancelled) {
          setHydrateError(error instanceof Error ? error.message : 'Could not sync vault records.');
          setVaults(filterVaults(getVaults(walletAddress), { cdrOnly, recoverableOnly }));
        }
      } finally {
        if (!cancelled) setHydrating(false);
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [cdrOnly, recoverableOnly, walletAddress]);

  return { vaults, hydrating, hydrateError, refreshVaults };
}
