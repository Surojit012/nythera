'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useFundWallet } from '@privy-io/react-auth';
import { storyAeneid } from '@/lib/wagmi';
import { useNytheraWallet } from '@/lib/hooks/use-nythera-wallet';
import { useStorageCredits } from '@/lib/hooks/use-storage-credits';
import { WalletIcon, KeyIcon, ShieldIcon, ChainIcon } from '@/components/ui/Icons';
import SuccessMotion from '@/components/ui/SuccessMotion';

const STORY_FAUCET_URL = process.env.NEXT_PUBLIC_STORY_AENEID_FAUCET_URL ?? 'https://faucet.story.foundation';

const FAUCET_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const FAUCET_STORAGE_KEY = 'nythera_faucet_last_claim';

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatCooldown(ms: number): string {
  if (ms <= 0) return '';
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
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

  // Faucet drip state
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState<{ txHash: string; amount: string } | null>(null);
  const [faucetError, setFaucetError] = useState('');
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Check cooldown from localStorage on mount and tick every minute
  const checkCooldown = useCallback(() => {
    if (!activeAddress) return;
    const stored = localStorage.getItem(`${FAUCET_STORAGE_KEY}_${activeAddress.toLowerCase()}`);
    if (stored) {
      const lastClaim = parseInt(stored, 10);
      const remaining = (lastClaim + FAUCET_COOLDOWN_MS) - Date.now();
      setCooldownRemaining(remaining > 0 ? remaining : 0);
    } else {
      setCooldownRemaining(0);
    }
  }, [activeAddress]);

  useEffect(() => {
    checkCooldown();
    const interval = setInterval(checkCooldown, 60_000); // update every minute
    return () => clearInterval(interval);
  }, [checkCooldown]);

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

  async function handleFaucetDrip() {
    if (!activeAddress || faucetLoading || cooldownRemaining > 0) return;

    setFaucetLoading(true);
    setFaucetError('');
    setFaucetSuccess(null);

    try {
      const res = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: activeAddress }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429 && data.nextEligible) {
          // Server says we're in cooldown
          const remaining = data.nextEligible - Date.now();
          setCooldownRemaining(remaining > 0 ? remaining : 0);
          localStorage.setItem(
            `${FAUCET_STORAGE_KEY}_${activeAddress.toLowerCase()}`,
            String(data.nextEligible - FAUCET_COOLDOWN_MS),
          );
        }
        setFaucetError(data.error || 'Faucet request failed.');
        return;
      }

      // Success
      setFaucetSuccess({ txHash: data.txHash, amount: data.amount });
      localStorage.setItem(
        `${FAUCET_STORAGE_KEY}_${activeAddress.toLowerCase()}`,
        String(Date.now()),
      );
      setCooldownRemaining(FAUCET_COOLDOWN_MS);

      // Refresh balance after a short delay for the tx to propagate
      setTimeout(() => refreshBalance(), 3000);
    } catch (err) {
      setFaucetError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setFaucetLoading(false);
    }
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
            <p className="ny-label text-warm-clay font-medium">Wallet</p>
            <h1 className="mt-2 font-display text-3xl text-ink md:text-4xl">Your Nythera wallet</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/60">
              Use this wallet for vault saves, recovery access, and gas fees on Story testnet.
            </p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-warm-clay/10 text-warm-clay">
            <WalletIcon size={22} />
          </div>
        </div>
      </section>

      {!activeAddress ? (
        <section className="ny-panel p-6 md:p-8">
          <p className="ny-label text-warm-clay font-medium">Wallet setup</p>
          <h2 className="ny-heading mt-2 text-xl">Create your in-app wallet</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-ink/60">
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
          {createWalletError && <p className="mt-4 text-sm text-red-600">{createWalletError}</p>}
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
                <div className="mt-3 rounded-2xl border border-ink/[0.08] bg-ink/[0.05] p-4">
                  <p className="break-all font-mono text-sm text-ink">{activeAddress}</p>
                  <p className="mt-2 text-xs text-ink/40">{truncateAddress(activeAddress)}</p>
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
                  <div className="mt-4 rounded-xl border border-warm-clay/20 bg-warm-clay/10 p-4 text-sm leading-6 text-ink">
                    Privy funding is not available for this testnet right now. Use the Story faucet to add testnet IP.
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs text-warm-clay font-semibold">Advanced details</summary>
                      <p className="mt-2 break-words font-mono text-xs text-ink/50">{fundingError}</p>
                    </details>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-ink/[0.08] bg-white/30 p-5">
                <p className="ny-label text-warm-clay font-medium">Top up</p>
                <h2 className="ny-heading mt-2 text-lg">Add testnet gas</h2>
                <p className="mt-3 text-sm leading-6 text-ink/60">
                  Get free testnet IP for vault creation and recovery transactions.
                </p>
                <div className="mt-5 space-y-2">
                  {/* Native faucet button */}
                  <button
                    type="button"
                    onClick={handleFaucetDrip}
                    disabled={faucetLoading || cooldownRemaining > 0}
                    className="ny-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {faucetLoading
                      ? 'Sending 0.5 IP...'
                      : cooldownRemaining > 0
                        ? `Next claim in ${formatCooldown(cooldownRemaining)}`
                        : 'Get 0.5 IP'}
                  </button>
                  <button type="button" onClick={() => openFaucet(STORY_FAUCET_URL)} className="ny-button-secondary w-full">
                    Open Story faucet
                  </button>
                </div>

                {/* Faucet success */}
                {faucetSuccess && (
                  <div className="ny-success-surface mt-4 rounded-xl border p-4">
                    <SuccessMotion
                      label={`${faucetSuccess.amount} IP sent!`}
                      detail="Your balance will update shortly."
                    />
                    <p className="mt-2 break-all font-mono text-[10px] text-ink/40">
                      tx: {faucetSuccess.txHash}
                    </p>
                  </div>
                )}

                {/* Faucet error */}
                {faucetError && (
                  <div className="mt-4 rounded-xl border border-red-300/30 bg-red-50/50 p-3 text-sm text-red-800">
                    {faucetError}
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      <details className="ny-panel p-6">
        <summary className="cursor-pointer text-xs font-medium uppercase tracking-[0.16em] text-ink/50">
          Advanced details
        </summary>
        <div className="mt-4 grid gap-3 text-xs text-ink/50 md:grid-cols-2">
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
          <p className="mt-3 text-xl font-semibold text-ink">{value}</p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-warm-clay/10 text-warm-clay">
          {icon}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-ink/60">{detail}</p>
    </div>
  );
}

function AdvancedRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-medium text-ink/50">{label}</p>
      <p className="mt-1 break-all font-mono text-ink/75">{value}</p>
    </div>
  );
}
