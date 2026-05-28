'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPublicClient, http } from 'viem';
import { createCDRClient } from '@/lib/crypto/cdr';
import { CDR_DEFAULTS } from '@/lib/crypto/cdr-config';
import { recoverVaultWithCDR } from '@/lib/crypto/vault';
import type { VaultData } from '@/lib/crypto/vault';
import { recordVaultRecovery } from '@/lib/store/vault-store';
import { createPrivyWalletClient } from '@/lib/privy';
import { accessSecretFromCDR } from '@/lib/crypto/cdr';
import { encodedAccessConditionAbi, WHITELIST_CONDITION, whitelistConditionAbi } from '@/lib/contracts';
import { useWalletVaults } from '@/lib/hooks/use-wallet-vaults';
import {
  decryptWalrusFile,
  parseWalrusFilePayload,
  type WalrusFilePayload,
} from '@/lib/crypto/file/walrus-file';
import { EyeIcon, KeyIcon, ShieldIcon, WalletIcon } from '@/components/ui/Icons';
import SuccessMotion from '@/components/ui/SuccessMotion';
import { useNytheraWallet } from '@/lib/hooks/use-nythera-wallet';

type RecoveredFile = {
  payload: WalrusFilePayload;
  url: string;
};

type RecoveryStepKey = 'wallet' | 'access' | 'unlock' | 'display';

type StepState = {
  completedAt?: number;
  failed?: boolean;
  error?: string;
};

type StepStates = Record<RecoveryStepKey, StepState>;

const emptySteps: StepStates = {
  wallet: {},
  access: {},
  unlock: {},
  display: {},
};

const recoverySteps: Array<{
  key: RecoveryStepKey;
  label: string;
  icon: typeof WalletIcon;
}> = [
  { key: 'wallet', label: 'Wallet connected', icon: WalletIcon },
  { key: 'access', label: 'Access verified', icon: ShieldIcon },
  { key: 'unlock', label: 'Secret unlocked', icon: KeyIcon },
  { key: 'display', label: 'Secret displayed', icon: EyeIcon },
];

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getRelativeTime(timestamp?: number): string {
  if (!timestamp) return '';
  if (timestamp === 1) return 'connected';
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 2) return 'just now';
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
}

function detectSecretType(secret: string): 'seed' | 'private-key' | 'note' {
  const trimmed = secret.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  if ((words.length === 12 || words.length === 24) && words.every((word) => /^[a-zA-Z]+$/.test(word))) {
    return 'seed';
  }
  if (/^0x[a-fA-F0-9]{64,66}$/.test(trimmed)) {
    return 'private-key';
  }
  return 'note';
}

export default function RecoverPage() {
  const { activeWallet: wallet, activeAddress: address } = useNytheraWallet();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState('');
  const [uuidInput, setUuidInput] = useState('');
  const [decrypted, setDecrypted] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [recoveredFile, setRecoveredFile] = useState<RecoveredFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accessStatus, setAccessStatus] = useState<'idle' | 'checking' | 'approved' | 'denied'>('idle');
  const [stepStates, setStepStates] = useState<StepStates>(emptySteps);
  const [helperOpen, setHelperOpen] = useState(false);

  const { vaults, hydrating, hydrateError } = useWalletVaults(address, {
    cdrOnly: true,
    recoverableOnly: true,
  });
  const activeSelectedId = selectedId || vaults[0]?.id || '';
  const selectedVault = vaults.find((v) => v.id === activeSelectedId) ?? null;
  const manualVaultId = uuidInput.trim();
  const displayed = Boolean(decrypted || recoveredFile);
  const lastVerifiedAt = stepStates.display.completedAt ?? stepStates.unlock.completedAt ?? stepStates.access.completedAt;
  const failedStep = recoverySteps.find((step) => stepStates[step.key].failed);

  const selectedVaultRole = useMemo(() => {
    if (!address || !selectedVault) return '';
    return selectedVault.ownerAddress.toLowerCase() === address.toLowerCase() ? 'Owner' : 'Trusted contact';
  }, [address, selectedVault]);

  useEffect(() => {
    return () => {
      if (recoveredFile) URL.revokeObjectURL(recoveredFile.url);
    };
  }, [recoveredFile]);

  function resetRecoveryState() {
    setError('');
    setDecrypted('');
    setCopiedSecret(false);
    setAccessStatus('idle');
    setStepStates({
      ...emptySteps,
      wallet: address ? { completedAt: Date.now() } : {},
    });
    if (recoveredFile) URL.revokeObjectURL(recoveredFile.url);
    setRecoveredFile(null);
  }

  function markStepComplete(key: RecoveryStepKey) {
    setStepStates((current) => ({
      ...current,
      [key]: { completedAt: Date.now() },
    }));
  }

  function markStepFailed(key: RecoveryStepKey, message: string) {
    setStepStates((current) => ({
      ...current,
      [key]: {
        ...current[key],
        failed: true,
        error: message,
      },
    }));
  }

  async function handleRecover() {
    resetRecoveryState();
    if (!address || !wallet) return;

    const useManualVaultId = Boolean(manualVaultId);
    const vault = useManualVaultId ? undefined : vaults.find((v) => v.id === activeSelectedId);
    const manualUuid = Number(manualVaultId);
    if (!vault && (!Number.isFinite(manualUuid) || manualUuid < 0)) {
      const message = 'Select a saved vault or enter a valid Vault ID.';
      setError(message);
      markStepFailed('access', message);
      return;
    }

    markStepComplete('wallet');
    setLoading(true);
    let accessVerified = false;
    try {
      setAccessStatus('checking');
      const publicClient = createPublicClient({
        transport: http(CDR_DEFAULTS.rpcUrl),
      });
      const walletClient = await createPrivyWalletClient({
        address,
        switchChain: wallet.switchChain,
        getEthereumProvider: wallet.getEthereumProvider,
      });

      const cdrClient = await createCDRClient({
        network: CDR_DEFAULTS.network,
        apiUrl: CDR_DEFAULTS.apiUrl,
        publicClient,
        walletClient,
      });

      const uuid = vault?.cdr?.uuid ?? manualUuid;
      const isEncodedAccessVault =
        vault?.cdr?.conditionVersion === 'v2-encoded-access' ||
        vault?.cdr?.conditionVersion === 'v3-origin-access';
      const accessConditionAddress = vault?.cdr?.accessConditionAddress;
      const readConditionData = vault?.cdr?.readConditionData;
      if (isEncodedAccessVault && accessConditionAddress && readConditionData) {
        const canRead = await publicClient.readContract({
          address: accessConditionAddress,
          abi: encodedAccessConditionAbi,
          functionName: 'checkReadCondition',
          args: [address as `0x${string}`, readConditionData, vault.cdr?.accessAuxData ?? '0x'],
        });

        if (!canRead) {
          const message = `This wallet cannot recover Vault ID ${uuid}. Connect the owner wallet or a trusted contact wallet.`;
          setError(message);
          setAccessStatus('denied');
          markStepFailed('access', message);
          return;
        }
      } else if (!WHITELIST_CONDITION) {
        const message = 'Recovery access checks are not configured. Please try again later.';
        setError(message);
        setAccessStatus('denied');
        markStepFailed('access', message);
        return;
      } else {
        const isWhitelisted = await publicClient.readContract({
          address: WHITELIST_CONDITION,
          abi: whitelistConditionAbi,
          functionName: 'isWhitelisted',
          args: [uuid, address as `0x${string}`],
        });

        if (!isWhitelisted) {
          const message = `This wallet is not allowed to recover Vault ID ${uuid}. Connect an approved wallet or ask the vault owner to grant access.`;
          setError(message);
          setAccessStatus('denied');
          markStepFailed('access', message);
          return;
        }
      }

      setAccessStatus('approved');
      markStepComplete('access');
      accessVerified = true;

      const secret = vault
        ? await recoverVaultWithCDR(vault, cdrClient, vault.cdr?.accessAuxData ?? '0x')
        : await accessSecretFromCDR({ client: cdrClient, uuid: manualUuid });
      markStepComplete('unlock');

      const filePayload = parseWalrusFilePayload(secret);
      if (filePayload) {
        const downloadUrl = new URL(
          `/api/storage/walrus/download/${encodeURIComponent(filePayload.blobId)}`,
          window.location.origin,
        );
        if (filePayload.objectId) downloadUrl.searchParams.set('objectId', filePayload.objectId);
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `File download failed (${response.status})`);
        }
        const blob = await decryptWalrusFile(filePayload, await response.arrayBuffer());
        setRecoveredFile({ payload: filePayload, url: URL.createObjectURL(blob) });
      } else {
        setDecrypted(secret);
      }
      markStepComplete('display');

      if (vault) {
        recordVaultRecovery(address, vault.id, {
          recoveredAt: Date.now(),
          recoveredBy: address,
          cdrUuid: uuid,
          contentType: vault.contentType ?? 'text',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Recovery failed.';
      setError(message);
      setAccessStatus('denied');
      markStepFailed(accessVerified ? 'unlock' : 'access', message);
    } finally {
      setLoading(false);
    }
  }

  function clearAndClose() {
    setDecrypted('');
    setCopiedSecret(false);
    if (recoveredFile) URL.revokeObjectURL(recoveredFile.url);
    setRecoveredFile(null);
    router.push('/dashboard');
  }

  async function copySecret(value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedSecret(true);
    window.setTimeout(() => setCopiedSecret(false), 1800);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <section className="ny-panel p-6 md:p-8">
        <p className="ny-label text-amber-200">Recovery</p>
        <h1 className="font-display text-3xl md:text-4xl text-white mt-2">Recover a saved vault</h1>
        <p className="text-sm text-zinc-400 mt-3 max-w-2xl">
          Choose a vault, confirm this wallet is allowed to open it, then decrypt the secret in your browser.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="ny-pill">Trusted contact access</span>
          <span className="ny-pill">Encrypted backup</span>
          <span className="ny-pill">Local decryption</span>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="ny-panel p-6 space-y-5">
          <div>
            <p className="ny-label text-amber-200">Recovery request</p>
            <h2 className="font-display text-xl text-white mt-2">Choose a vault to recover</h2>
          </div>

          {vaults.length === 0 ? (
            <div className="rounded-2xl border border-muted-gold/30 bg-muted-gold/12 p-4">
              <p className="font-medium leading-7 text-ink/72">
                {hydrating
                  ? 'Syncing saved vaults...'
                  : 'No vaults found for this wallet. Ask the vault owner to share their Vault ID.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <select
                value={activeSelectedId}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  setUuidInput('');
                }}
                className="select-chevron w-full ny-input px-3 py-2 text-white"
              >
                {vaults.map((v) => {
                  const role = address && v.ownerAddress.toLowerCase() === address.toLowerCase() ? 'Owner' : 'Trusted contact';
                  return (
                    <option key={v.id} value={v.id}>
                      {v.name?.trim() || 'Untitled vault'} - {truncateAddress(v.ownerAddress)} - {role}
                    </option>
                  );
                })}
              </select>

              {selectedVault && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-lg text-white">{selectedVault.name?.trim() || 'Untitled vault'}</p>
                      <p className="mt-1 text-xs text-zinc-500">Owner {truncateAddress(selectedVault.ownerAddress)}</p>
                    </div>
                    <span className="rounded-full border border-amber-200/25 bg-amber-300/10 px-2.5 py-1 text-xs text-amber-100">
                      {selectedVaultRole}
                    </span>
                  </div>
                  {selectedVault.tags && selectedVault.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {selectedVault.tags.slice(0, 5).map((tag) => (
                        <span key={tag} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-zinc-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {hydrateError && (
            <p className="text-xs text-amber-200">Vault sync is using this browser cache only: {hydrateError}</p>
          )}

          <details open={vaults.length === 0} className="rounded-2xl border border-white/10 bg-black/18 p-4">
            <summary className="cursor-pointer text-sm font-medium text-zinc-300">
              Or paste a Vault ID manually
            </summary>
            <div className="mt-4">
              <label className="block text-xs font-medium mb-1 text-zinc-300">Vault ID</label>
              <input
                value={uuidInput}
                onChange={(e) => setUuidInput(e.target.value)}
                className="w-full ny-input px-3 py-2 font-mono text-sm text-white"
                placeholder="Paste shared Vault ID"
              />
            </div>
          </details>

          <button
            onClick={handleRecover}
            disabled={loading || (!activeSelectedId && !manualVaultId)}
            className="ny-button disabled:opacity-50"
          >
            {loading ? 'Recovering...' : 'Recover Secret'}
          </button>

          {error && (
            <div className="rounded-xl border border-red-300/25 bg-red-300/10 p-4">
              <p className="text-sm text-red-100">{error}</p>
              <button
                type="button"
                onClick={handleRecover}
                disabled={loading}
                className="mt-3 ny-button-secondary min-h-0 px-3 py-1 text-xs disabled:opacity-50"
              >
                Retry
              </button>
            </div>
          )}

          {decrypted && (
            <RecoveredSecretView
              secret={decrypted}
              copied={copiedSecret}
              onCopy={copySecret}
            />
          )}

          {recoveredFile && (
            <RecoveredFileView recoveredFile={recoveredFile} />
          )}

          {displayed && (
            <>
              <div className="ny-success-surface rounded-xl border p-4">
                <SuccessMotion
                  label={recoveredFile ? 'File ready to download' : 'Secret recovered'}
                  detail="The decrypted result is only shown in this browser tab."
                />
              </div>
              <div className="rounded-xl border border-amber-200/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50">
                You&apos;ve accessed this secret. Close this tab when you&apos;re done and never screenshot your seed phrase.
              </div>
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                <button type="button" onClick={clearAndClose} className="ny-button">
                  Done - close this page
                </button>
                {selectedVault && (
                  <Link href={`/vault/${selectedVault.id}`} className="ny-button-secondary">
                    View vault details
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setHelperOpen(true)}
                  className="text-sm font-medium text-amber-100 transition hover:text-white"
                >
                  Something went wrong?
                </button>
              </div>
            </>
          )}
        </div>

        <div className="space-y-6">
          <AccessStatusPanel
            address={address}
            accessStatus={accessStatus}
            secretDisplayed={displayed}
            loading={loading}
            error={error}
          />

          <RecoveryTimeline
            steps={address && !stepStates.wallet.completedAt
              ? { ...stepStates, wallet: { completedAt: 1 } }
              : stepStates}
            loading={loading}
            failedStep={failedStep?.key}
            onRetry={handleRecover}
          />

          <AdvancedRecoveryDetails
            vault={selectedVault}
            manualVaultId={manualVaultId}
            network={CDR_DEFAULTS.network}
            lastVerifiedAt={lastVerifiedAt}
          />
        </div>
      </section>

      {helperOpen && (
        <RecoveryHelpModal onClose={() => setHelperOpen(false)} />
      )}
    </div>
  );
}

function RecoveredSecretView({
  secret,
  copied,
  onCopy,
}: {
  secret: string;
  copied: boolean;
  onCopy: (value: string) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const type = detectSecretType(secret);
  const trimmed = secret.trim();

  if (type === 'seed') {
    const words = trimmed.split(/\s+/);
    return (
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium text-zinc-500">Recovered seed phrase</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {words.map((word, index) => (
              <div key={`${word}-${index}`} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                <span className="w-6 text-right font-mono text-xs text-amber-200/80">{index + 1}</span>
                <span className="min-w-0 flex-1 font-mono text-sm text-white">{word}</span>
              </div>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => onCopy(secret)} className="ny-button-secondary">
          {copied ? <SuccessMotion size="sm" label="Copied" /> : 'Copy all words'}
        </button>
      </div>
    );
  }

  if (type === 'private-key') {
    return (
      <div className="space-y-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-zinc-500">Recovered private key</p>
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            className="ny-button-secondary min-h-0 px-3 py-1 text-xs"
          >
            {revealed ? 'Hide' : 'Reveal'}
          </button>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/25 p-4 font-mono text-sm text-white break-all">
          {revealed ? trimmed : '0x••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
        </div>
        <button type="button" onClick={() => onCopy(trimmed)} className="ny-button-secondary">
          {copied ? <SuccessMotion size="sm" label="Copied" /> : 'Copy'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-zinc-500">Recovered note</p>
        <button
          type="button"
          onClick={() => onCopy(secret)}
          className="ny-button-secondary min-h-0 px-3 py-1 text-xs"
        >
          {copied ? <SuccessMotion size="sm" label="Copied" /> : 'Copy'}
        </button>
      </div>
      <div className="rounded-xl border border-white/10 bg-black/25 p-4 text-sm leading-7 text-zinc-100 whitespace-pre-wrap break-words">
        {secret}
      </div>
    </div>
  );
}

function RecoveredFileView({ recoveredFile }: { recoveredFile: RecoveredFile }) {
  return (
    <div className="ny-success-surface space-y-4 rounded-2xl border p-4">
      <SuccessMotion
        label="File decrypted"
        detail="Download it when you are ready."
        size="sm"
      />
      <div>
        <p className="text-xs font-medium text-zinc-500 mb-1">Recovered file</p>
        <p className="text-base font-medium text-zinc-100">{recoveredFile.payload.fileName}</p>
        <p className="text-sm text-zinc-500">{formatFileSize(recoveredFile.payload.fileSize)}</p>
        {recoveredFile.payload.note && (
          <p className="text-xs text-zinc-400 mt-2">{recoveredFile.payload.note}</p>
        )}
        {recoveredFile.payload.endDate && (
          <p className="text-xs text-zinc-500 mt-1">
            File storage currently expires around {new Date(recoveredFile.payload.endDate).toLocaleDateString()}.
          </p>
        )}
      </div>
      {recoveredFile.payload.mimeType.startsWith('image/') && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={recoveredFile.url}
          alt={recoveredFile.payload.fileName}
          className="max-h-80 rounded-xl border border-white/10 bg-black/30 object-contain"
        />
      )}
      <a
        href={recoveredFile.url}
        download={recoveredFile.payload.fileName}
        className="ny-button-secondary"
      >
        Download decrypted file
      </a>
    </div>
  );
}

function AccessStatusPanel({
  address,
  accessStatus,
  secretDisplayed,
  loading,
  error,
}: {
  address?: string;
  accessStatus: 'idle' | 'checking' | 'approved' | 'denied';
  secretDisplayed: boolean;
  loading: boolean;
  error: string;
}) {
  return (
    <div className="ny-panel p-6">
      <p className="ny-label text-amber-200">Verification</p>
      <h3 className="font-display text-xl text-white mt-2">Access status</h3>
      <div className="mt-4 space-y-4">
        <StatusRow
          label="Wallet connected"
          subtitle={address ? truncateAddress(address) : 'Connect your wallet to begin'}
          state={address ? 'complete' : 'pending'}
          error={!address ? 'Wallet is not connected.' : undefined}
        />
        <StatusRow
          label="Access verified"
          subtitle={accessStatus === 'approved' ? "You're on the trusted contacts list" : 'Checking the trusted contacts list'}
          state={accessStatus === 'approved' ? 'complete' : accessStatus === 'denied' ? 'failed' : accessStatus === 'checking' ? 'pending' : 'pending'}
          error={accessStatus === 'denied' ? (error || 'This wallet is not approved for this vault.') : undefined}
        />
        <StatusRow
          label="Secret unlocked"
          subtitle={secretDisplayed ? 'Decrypted in your browser only' : 'Waiting for recovery to finish'}
          state={secretDisplayed ? 'complete' : loading ? 'pending' : error && accessStatus === 'approved' ? 'failed' : 'pending'}
          error={error && accessStatus === 'approved' ? 'The secret could not be unlocked.' : undefined}
        />
      </div>
    </div>
  );
}

function StatusRow({
  label,
  subtitle,
  state,
  error,
}: {
  label: string;
  subtitle: string;
  state: 'pending' | 'complete' | 'failed';
  error?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3">
      <span className={`mt-1 grid h-5 w-5 place-items-center rounded-full text-xs ${state === 'complete'
        ? 'bg-emerald-300/15 text-emerald-200'
        : state === 'failed'
          ? 'bg-red-300/15 text-red-200'
          : 'bg-white/10 text-zinc-400 animate-pulse'
      }`}
      >
        {state === 'complete' ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : state === 'failed' ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        ) : null}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-zinc-200">{label}</p>
        <p className={`mt-1 text-xs ${state === 'failed' ? 'text-red-200' : 'text-zinc-500'}`}>
          {error ?? subtitle}
        </p>
      </div>
    </div>
  );
}

function RecoveryTimeline({
  steps,
  loading,
  failedStep,
  onRetry,
}: {
  steps: StepStates;
  loading: boolean;
  failedStep?: RecoveryStepKey;
  onRetry: () => void;
}) {
  return (
    <div className="ny-panel p-6">
      <p className="ny-label">Recovery timeline</p>
      <div className="mt-5">
        {recoverySteps.map((step, index) => {
          const state = steps[step.key];
          const complete = Boolean(state.completedAt);
          const failed = Boolean(state.failed);
          const Icon = step.icon;
          return (
            <div key={step.key} className="relative flex gap-3 pb-6 last:pb-0">
              {index < recoverySteps.length - 1 && (
                <span className={`absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px ${complete ? 'bg-emerald-300/40' : 'bg-white/10'}`} />
              )}
              <span className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border ${failed
                ? 'border-red-300/40 bg-red-300/15 text-red-200'
                : complete
                  ? 'ny-success-mark border-emerald-300/40 bg-emerald-300/15 text-emerald-200'
                  : loading && !failedStep
                    ? 'border-amber-200/30 bg-amber-300/10 text-amber-100 animate-pulse'
                    : 'border-white/10 bg-white/[0.03] text-zinc-500'
              }`}
              >
                <Icon size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-zinc-200">{step.label}</p>
                <p className={`mt-1 text-xs ${failed ? 'text-red-200' : 'text-zinc-500'}`}>
                  {failed ? state.error : complete ? getRelativeTime(state.completedAt) : 'Waiting'}
                </p>
                {failed && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-2 ny-button-secondary min-h-0 px-3 py-1 text-xs"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdvancedRecoveryDetails({
  vault,
  manualVaultId,
  network,
  lastVerifiedAt,
}: {
  vault: VaultData | null;
  manualVaultId: string;
  network: string;
  lastVerifiedAt?: number;
}) {
  return (
    <details className="ny-panel p-6">
      <summary className="cursor-pointer text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
        Advanced
      </summary>
      <div className="mt-4 space-y-3 text-xs text-zinc-500">
        <AdvancedRow label="Raw Vault ID" value={vault?.cdr?.uuid ? String(vault.cdr.uuid) : manualVaultId || 'Not selected'} />
        <AdvancedRow label="CDR reference" value={vault?.cdr?.writeTxHash ?? 'Only available for saved vaults'} />
        <AdvancedRow label="Network" value={network} />
        <AdvancedRow label="Last verified" value={lastVerifiedAt ? new Date(lastVerifiedAt).toLocaleString() : 'Not verified yet'} />
      </div>
    </details>
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

function RecoveryHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="ny-modal relative z-10 w-full max-w-md rounded-2xl p-6">
        <p className="ny-label text-amber-200">Recovery help</p>
        <h3 className="mt-2 font-display text-2xl text-white">Common recovery issues</h3>
        <div className="mt-4 space-y-3 text-sm leading-6 text-zinc-400">
          <p><span className="text-zinc-200">Wrong wallet connected:</span> switch to the owner wallet or trusted contact wallet.</p>
          <p><span className="text-zinc-200">Not on the trusted contacts list:</span> ask the vault owner to add this wallet.</p>
          <p><span className="text-zinc-200">Vault was deleted:</span> ask the owner to share a current Vault ID.</p>
          <p><span className="text-zinc-200">File unavailable:</span> the encrypted file backup may need storage renewal.</p>
        </div>
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="ny-button-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
