'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCreateWallet, usePrivy, useWallets, type ConnectedWallet } from '@privy-io/react-auth';
import { createPublicClient, formatEther, http } from 'viem';
import { storyAeneid } from '@/lib/wagmi';

function isEmbeddedWallet(wallet: ConnectedWallet): boolean {
  return wallet.walletClientType === 'privy' || wallet.walletClientType === 'privy-v2';
}

const publicClient = createPublicClient({
  chain: storyAeneid,
  transport: http(storyAeneid.rpcUrls.default.http[0]),
});

export type NytheraWalletState = {
  authenticated: boolean;
  activeWallet?: ConnectedWallet;
  activeAddress?: string;
  embeddedWallet?: ConnectedWallet;
  externalWallets: ConnectedWallet[];
  isEmbedded: boolean;
  balance: string;
  balanceLoading: boolean;
  balanceError: string;
  createEmbeddedWallet: () => Promise<boolean>;
  creatingWallet: boolean;
  createWalletError: string;
  refreshBalance: () => Promise<void>;
};

export function useNytheraWallet(): NytheraWalletState {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const [balance, setBalance] = useState('');
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState('');
  const [creatingWallet, setCreatingWallet] = useState(false);
  const [createWalletError, setCreateWalletError] = useState('');

  const ethereumWallets = useMemo(
    () => wallets.filter((wallet): wallet is ConnectedWallet => wallet.type === 'ethereum'),
    [wallets],
  );
  const embeddedWallet = ethereumWallets.find(isEmbeddedWallet);
  const externalWallets = ethereumWallets.filter((wallet) => !isEmbeddedWallet(wallet));
  const activeWallet = embeddedWallet ?? externalWallets[0];
  const activeAddress = activeWallet?.address;
  const isEmbedded = Boolean(activeWallet && isEmbeddedWallet(activeWallet));

  const refreshBalance = useCallback(async () => {
    if (!activeAddress) {
      setBalance('');
      setBalanceError('');
      setBalanceLoading(false);
      return;
    }

    setBalanceLoading(true);
    setBalanceError('');
    try {
      const wei = await publicClient.getBalance({ address: activeAddress as `0x${string}` });
      setBalance(Number(formatEther(wei)).toLocaleString(undefined, {
        maximumFractionDigits: 5,
      }));
    } catch (error) {
      setBalanceError(error instanceof Error ? error.message : 'Could not load wallet balance.');
      setBalance('');
    } finally {
      setBalanceLoading(false);
    }
  }, [activeAddress]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshBalance();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [refreshBalance]);

  const createEmbeddedWallet = useCallback(async () => {
    setCreatingWallet(true);
    setCreateWalletError('');
    try {
      await createWallet();
      return true;
    } catch (error) {
      setCreateWalletError(error instanceof Error ? error.message : 'Could not create your Nythera wallet.');
      return false;
    } finally {
      setCreatingWallet(false);
    }
  }, [createWallet]);

  return {
    authenticated,
    activeWallet,
    activeAddress,
    embeddedWallet,
    externalWallets,
    isEmbedded,
    balance,
    balanceLoading,
    balanceError,
    createEmbeddedWallet,
    creatingWallet,
    createWalletError,
    refreshBalance,
  };
}
