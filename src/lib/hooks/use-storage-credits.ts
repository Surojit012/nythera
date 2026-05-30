'use client';

import { useCallback, useEffect, useState } from 'react';

export type StorageCreditsState = {
  balance: number | null;
  requiredForUpload: number;
  loading: boolean;
  error: string;
  skipped: boolean;
  refresh: () => Promise<void>;
};

type StorageCreditsResponse = {
  balance?: number | null;
  requiredForUpload?: number;
  skipped?: boolean;
  error?: string;
};

export function useStorageCredits(walletAddress?: string, options: { fetchFn?: typeof fetch } = {}): StorageCreditsState {
  const fetchFn = options.fetchFn ?? fetch;
  const [balance, setBalance] = useState<number | null>(null);
  const [requiredForUpload, setRequiredForUpload] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [skipped, setSkipped] = useState(false);

  const refresh = useCallback(async () => {
    if (!walletAddress) {
      setBalance(null);
      setError('');
      setSkipped(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetchFn(`/api/storage/credits?wallet=${encodeURIComponent(walletAddress)}`);
      const body = (await response.json().catch(() => ({}))) as StorageCreditsResponse;
      if (!response.ok && !body.skipped) {
        throw new Error(body.error ?? `Could not load storage credits (${response.status})`);
      }
      setBalance(typeof body.balance === 'number' ? body.balance : null);
      setRequiredForUpload(body.requiredForUpload ?? 2);
      setSkipped(Boolean(body.skipped));
    } catch (creditError) {
      setError(creditError instanceof Error ? creditError.message : 'Could not load storage credits.');
      setBalance(null);
      setSkipped(false);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, walletAddress]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  return {
    balance,
    requiredForUpload,
    loading,
    error,
    skipped,
    refresh,
  };
}
