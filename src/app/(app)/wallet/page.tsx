'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { useFundWallet } from '@privy-io/react-auth';
import { storyAeneid } from '@/lib/wagmi';
import { useNytheraWallet } from '@/lib/hooks/use-nythera-wallet';
import { useStorageCredits } from '@/lib/hooks/use-storage-credits';
import { WalletIcon, KeyIcon, ShieldIcon, ChainIcon } from '@/components/ui/Icons';
import SuccessMotion from '@/components/ui/SuccessMotion';

const STORY_FAUCET_URL = process.env.NEXT_PUBLIC_STORY_AENEID_FAUCET_URL ?? 'https://faucet.story.foundation';
const GOOGLE_FAUCET_URL =
  process.env.NEXT_PUBLIC_STORY_AENEID_GOOGLE_FAUCET_URL ??
  'https://cloud.google.com/application/web3/faucet/story/aeneid';

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function WalletPage() {
  const {
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
  } = useNytheraWallet();
  const storageCredits = useStorageCredits(activeAddress);
  const { fundWallet } = useFundWallet();
  const [copied, setCopied] = useState(false);
  const [walletCreated, setWalletCreated] = useState(false);
  const [faucetOpened, setFaucetOpened] = useState(false);
  const [fundingStatus, setFundingStatus] = useState('');
  const [fundingError, setFundingError] = useState('');

  async function copyAddress() {
    if (!activeAddress) return;
    await navigator.clipboard.writeText(activeAddress);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function handleCreateWallet() {
    const created = await createEmbeddedWallet();
    if (created) {
      setWalletCreated(true);
      window.setTimeout(() => setWalletCreated(false), 2200);
      await refreshBalance();
    }
  }

  async function openFaucet(url = STORY_FAUCET_URL) {
    if (activeAddress) {
      await navigator.clipboard.writeText(activeAddress);
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    setFaucetOpened(true);
    window.setTimeout(() => setFaucetOpened(false), 2200);
  }

  async function fundWithPrivy() {
    if (!activeAddress) return;
    setFundingStatus('');
    setFundingError('');
    try {
      if (activeWallet?.fund) {
        await activeWallet.fund({
          chain: storyAeneid,
          amount: '1',
        });
        setFundingStatus('Funding started');
      } else {
        const result = await fundWallet({
          address: activeAddress,
          options: {
            chain: storyAeneid,
            amount: '1',
          },
        });
        setFundingStatus(result.status === 'completed' ? 'Funding completed' : 'Funding flow closed');
      }
      await refreshBalance();
    } catch (error) {
      setFundingError(
        error instanceof Error
          ? error.message
          : 'Privy funding is not available for this network yet. Use the testnet faucet instead.',
      );
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="ny-panel p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="ny-label text-amber-200">Wallet</p>
            <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">Your Nythera wallet</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Use this wallet for vault saves, recovery access, and gas fees on Story testnet.
            </p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-400/10 text-violet-200">
            <WalletIcon size={22} />
          </div>
        </div>
      </section>

      {!activeAddress ? (
        <section className="ny-panel p-6 md:p-8">
          <p className="ny-label text-amber-200">Wallet setup</p>
          <h2 className="ny-heading mt-2 text-xl">Create your in-app wallet</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
            You are signed in, but Nythera does not see an app wallet yet. Create one to save vaults and pay testnet gas.
          </p>
          <button
            type="button"
            onClick={handleCreateWallet}
            disabled={!authenticated || creatingWallet}
            className="ny-button mt-5 disabled:opacity-50"
          >
            {creatingWallet ? 'Creating wallet...' : 'Create Nythera wallet'}
          </button>
          {walletCreated && (
            <div className="ny-success-surface mt-5 rounded-xl border p-4">
              <SuccessMotion label="Wallet created" detail="Your Nythera wallet is ready." />
            </div>
          )}
          {createWalletError && <p className="mt-4 text-sm text-red-200">{createWalletError}</p>}
        </section>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <WalletMetric
              label="Wallet type"
              value={isEmbedded ? 'Nythera wallet' : 'Connected wallet'}
              detail={isEmbedded ? 'Created by Privy for this account' : 'External wallet connected to Nythera'}
              icon={<ShieldIcon size={17} />}
            />
            <WalletMetric
              label="Story balance"
              value={balanceLoading ? 'Checking...' : `${balance || '0'} IP`}
              detail={balanceError || 'Used for gas fees on testnet'}
              icon={<ChainIcon size={17} />}
            />
            <WalletMetric
              label="File storage credits"
              value={storageCredits.loading ? 'Checking...' : storageCredits.balance === null ? 'Untracked' : String(storageCredits.balance)}
              detail={`File backups use ${storageCredits.requiredForUpload} credits`}
              icon={<KeyIcon size={17} />}
            />
          </section>

          <section className="ny-panel p-6 md:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <p className="ny-label">Wallet address</p>
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/22 p-4">
                  <p className="break-all font-mono text-sm text-white">{activeAddress}</p>
                  <p className="mt-2 text-xs text-zinc-500">{truncateAddress(activeAddress)}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={copyAddress} className="ny-button-secondary">
                    {copied ? <SuccessMotion size="sm" label="Copied" /> : 'Copy address'}
                  </button>
                  <button type="button" onClick={() => openFaucet()} className="ny-button">
                    Get testnet IP
                  </button>
                  <button type="button" onClick={fundWithPrivy} className="ny-button-secondary">
                    Fund wallet
                  </button>
                </div>
                {faucetOpened && (
                  <div className="ny-success-surface mt-4 rounded-xl border p-4">
                    <SuccessMotion label="Faucet opened" detail="Your address was copied for the faucet." />
                  </div>
                )}
                {fundingStatus && (
                  <div className="ny-success-surface mt-4 rounded-xl border p-4">
                    <SuccessMotion label={fundingStatus} detail="Funds can take a few minutes to appear." />
                  </div>
                )}
                {fundingError && (
                  <div className="mt-4 rounded-xl border border-amber-200/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50">
                    Privy funding is not available for this testnet right now. Use the Story faucet to add testnet IP.
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs text-amber-100">Advanced details</summary>
                      <p className="mt-2 break-words font-mono text-xs text-zinc-400">{fundingError}</p>
                    </details>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-amber-200/15 bg-amber-300/[0.06] p-5">
                <p className="ny-label text-amber-200">Top up</p>
                <h2 className="ny-heading mt-2 text-lg">Add testnet gas</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  The faucet gives testnet IP for vault creation and recovery transactions.
                </p>
                <div className="mt-5 space-y-2">
                  <button type="button" onClick={() => openFaucet(STORY_FAUCET_URL)} className="ny-button w-full">
                    Open Story faucet
                  </button>
                  <button type="button" onClick={() => openFaucet(GOOGLE_FAUCET_URL)} className="ny-button-secondary w-full">
                    Open Google faucet
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      <details className="ny-panel p-6">
        <summary className="cursor-pointer text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
          Advanced details
        </summary>
        <div className="mt-4 grid gap-3 text-xs text-zinc-500 md:grid-cols-2">
          <AdvancedRow label="Network" value={storyAeneid.name} />
          <AdvancedRow label="Chain ID" value={String(storyAeneid.id)} />
          <AdvancedRow label="RPC" value={storyAeneid.rpcUrls.default.http[0]} />
          <AdvancedRow label="Wallet policy" value="Embedded Nythera wallet first" />
          <AdvancedRow label="Embedded wallet" value={embeddedWallet?.address ?? 'Not created'} />
          <AdvancedRow label="External wallets" value={externalWallets.length ? externalWallets.map((wallet) => wallet.address).join(', ') : 'None connected'} />
        </div>
      </details>
    </div>
  );
}

function WalletMetric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <div className="ny-tile p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ny-label">{label}</p>
          <p className="mt-3 text-xl font-semibold text-white">{value}</p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-300/10 text-amber-100">
          {icon}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{detail}</p>
    </div>
  );
}

function AdvancedRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-medium text-zinc-400">{label}</p>
      <p className="mt-1 break-all font-mono text-zinc-600">{value}</p>
    </div>
  );
}
