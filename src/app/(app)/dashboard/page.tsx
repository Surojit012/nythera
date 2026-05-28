'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import VaultCard from '@/components/app/VaultCard';
import { ChainIcon, ClockIcon, KeyIcon, LockIcon, ShieldIcon, VaultIcon } from '@/components/ui/Icons';
import type { VaultData } from '@/lib/crypto/vault';
import { deleteVault as deleteLocalVault } from '@/lib/store/vault-store';
import { createPrivyWalletClient } from '@/lib/privy';
import { useWalletVaults } from '@/lib/hooks/use-wallet-vaults';
import { useStorageCredits } from '@/lib/hooks/use-storage-credits';
import SuccessMotion from '@/components/ui/SuccessMotion';
import { useNytheraWallet } from '@/lib/hooks/use-nythera-wallet';

export default function DashboardPage() {
  const { activeWallet, activeAddress: address } = useNytheraWallet();
  const [deletedVaultIds, setDeletedVaultIds] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<VaultData | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [signatureChecksum, setSignatureChecksum] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const { vaults: hydratedVaults, hydrating, hydrateError } = useWalletVaults(address);
  const storageCredits = useStorageCredits(address);
  const vaults = hydratedVaults.filter((vault) => !deletedVaultIds.includes(vault.id));
  const availableTags = useMemo(
    () => [...new Set(vaults.flatMap((vault) => vault.tags ?? []))].sort((a, b) => a.localeCompare(b)),
    [vaults],
  );
  const filteredVaults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return vaults.filter((vault) => {
      const matchesQuery = !query ||
        (vault.name ?? '').toLowerCase().includes(query) ||
        (vault.description ?? '').toLowerCase().includes(query);
      const matchesTag = !selectedTag || (vault.tags ?? []).some((tag) => tag.toLowerCase() === selectedTag.toLowerCase());
      return matchesQuery && matchesTag;
    });
  }, [searchQuery, selectedTag, vaults]);
  const activeVaults = vaults.filter((vault) => vault.status === 'active');
  const recoverableVaults = vaults.filter((vault) => vault.recoverability?.recoverable !== false);
  const unavailableVaults = vaults.filter((vault) => vault.recoverability?.recoverable === false);
  const recoveringVaults = vaults.filter((vault) => vault.status === 'recovering');
  const lockedVaults = vaults.filter((vault) => vault.status === 'locked');
  const cdrVaults = vaults.filter((vault) => Boolean(vault.cdr));
  const walrusVaults = vaults.filter((vault) => vault.contentType === 'walrus-file');
  const readinessScore = vaults.length
    ? Math.round((recoverableVaults.length / vaults.length) * 100)
    : 0;
  const recentVaults = [...vaults].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);

  async function handleDeleteVault(vault: VaultData) {
    if (!address) return;
    if (!activeWallet) return;
    setConfirmingDelete(true);
    setDeleteError('');
    setSignatureChecksum('');
    try {
      const walletClient = await createPrivyWalletClient({
        address,
        switchChain: activeWallet.switchChain,
        getEthereumProvider: activeWallet.getEthereumProvider,
      });
      const nonce = new Date().toISOString();
      const signatureMessage = [
        'Nythera Vault Deletion Request',
        `Vault ID: ${vault.id}`,
        `Wallet: ${address}`,
        `Timestamp: ${nonce}`,
      ].join('\n');
      const signature = await walletClient.signMessage({ message: signatureMessage });
      const checksum = `${signature.slice(0, 10)}...${signature.slice(-8)}`;
      setSignatureChecksum(checksum);

      const response = await fetch('/api/vault-records', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          cdrUuid: vault.cdr?.uuid,
          localVaultId: vault.id,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { skipped?: boolean; error?: string };
      if (!response.ok && !body.skipped) {
        throw new Error(body.error ?? `Failed to delete vault metadata (${response.status})`);
      }

      deleteLocalVault(address, vault.id);
      setDeletedVaultIds((prev) => [...prev, vault.id]);
      setPendingDelete(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Could not delete vault.');
    } finally {
      setConfirmingDelete(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-2xl bg-white/[0.035] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.18)] md:p-6">
        <div className="flex flex-col gap-5">
          <div className="max-w-2xl">
            <h2 className="ny-heading mt-4 text-2xl md:text-3xl">
              Your recovery vaults
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
              See the secrets you have protected, who can help recover them, and which backups need attention.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardMetric
            label="Readiness"
            value={`${readinessScore}%`}
            detail={`${recoverableVaults.length} ready to recover`}
            tone="emerald"
          />
          <DashboardMetric
            label="Saved vaults"
            value={String(vaults.length)}
            detail={`${cdrVaults.length} encrypted backups`}
            tone="violet"
          />
          <DashboardMetric
            label="File backups"
            value={String(walrusVaults.length)}
            detail="encrypted files"
            tone="cyan"
          />
          <DashboardMetric
            label="Needs attention"
            value={String(unavailableVaults.length)}
            detail="not recoverable right now"
            tone="amber"
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_360px]">
        <div className="rounded-2xl bg-white/[0.025] p-4 md:p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="ny-heading text-lg">Vault workspace</h3>
              <p className="mt-1 text-sm text-zinc-500">Backups available to this connected wallet.</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-black/20 px-3 py-2 font-mono text-xs text-zinc-500">
              <span>{cdrVaults.length} encrypted</span>
              <span className="text-zinc-700">/</span>
              <span>{vaults.length} total</span>
            </div>
          </div>

          {vaults.length > 0 && (
            <div className="mb-5 rounded-2xl border border-white/10 bg-black/18 p-3">
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="ny-input w-full px-3 py-2 text-sm text-white"
                  placeholder="Search by vault name or description"
                />
                {(searchQuery || selectedTag) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedTag('');
                    }}
                    className="ny-button-secondary min-h-0 px-3 py-2 text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>
              {availableTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag((current) => current === tag ? '' : tag)}
                      className={`rounded-full border px-3 py-1 text-xs transition ${selectedTag === tag
                        ? 'border-amber-200/50 bg-amber-300/15 text-amber-100'
                        : 'border-white/10 bg-white/[0.03] text-zinc-500 hover:border-amber-200/35 hover:text-amber-100'
                        }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {vaults.length === 0 ? (
            hydrating ? <SyncingVaultState /> : <EmptyVaultState />
          ) : filteredVaults.length === 0 ? (
            <div className="rounded-2xl bg-black/18 p-8">
              <p className="ny-label">No matching vaults</p>
              <h3 className="ny-heading mt-2 text-xl">Try a different search or tag</h3>
              <p className="mt-3 text-sm text-zinc-500">Your vaults are still safe. The current filter just hides them from this view.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredVaults.map((vault) => {
                const recipientGuardianCount =
                  (vault.recipients?.wallets.length ?? 0) + (vault.recipients?.emails.length ?? 0);
                const guardianCount =
                  vault.contentType === 'walrus-file' || vault.cdr ? recipientGuardianCount : vault.guardians.length;

                return (
                  <VaultCard
                    key={vault.id}
                    id={vault.id}
                    name={vault.name}
                    description={vault.description}
                    tags={vault.tags}
                    threshold={vault.threshold}
                    totalShares={vault.totalShares}
                    guardianCount={guardianCount}
                    createdAt={vault.createdAt}
                    status={vault.status}
                    timelockDelay={vault.timelockDelay}
                    ipfsCid={vault.cdr ? `cdr-uuid-${vault.cdr.uuid}` : vault.ipfsCid}
                    contentType={vault.contentType}
                    fileName={vault.walrus?.fileName}
                    walrusEndDate={vault.walrus?.endDate}
                    renewalMode={vault.walrus?.renewalMode}
                    recoverable={vault.recoverability?.recoverable !== false}
                    recoverabilityReason={vault.recoverability?.reason}
                    onDelete={() => {
                      setPendingDelete(vault);
                      setDeleteError('');
                      setSignatureChecksum('');
                      setDeleteConfirmText('');
                    }}
                  />
                );
              })}
            </div>
          )}
          {hydrateError && (
            <p className="mt-4 text-xs text-amber-200">
              Vault sync is using this browser cache only: {hydrateError}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-200/15 bg-amber-300/[0.06] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="ny-heading text-base">File storage credits</h3>
                <p className="mt-1 text-xs text-zinc-500">Used when you save encrypted file backups.</p>
              </div>
              <LockIcon size={17} className="text-amber-100/80" />
            </div>
            <div className="mt-5 rounded-xl bg-black/18 p-4">
              <p className="text-xs text-zinc-500">Available balance</p>
              <p className="mt-2 font-mono text-3xl text-white">
                {storageCredits.loading
                  ? '...'
                  : storageCredits.balance === null
                    ? storageCredits.skipped ? 'Untracked' : '-'
                    : storageCredits.balance}
              </p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                File backups use {storageCredits.requiredForUpload} credits each.
              </p>
              {storageCreditsKnownLow(storageCredits.balance, storageCredits.requiredForUpload) && (
                <p className="mt-3 text-xs leading-5 text-amber-100">
                  Ask the admin to add storage credits before creating your next file backup.
                </p>
              )}
              {storageCredits.error && (
                <p className="mt-3 text-xs leading-5 text-amber-100">{storageCredits.error}</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.025] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="ny-heading text-base">Vault health</h3>
                <p className="mt-1 text-xs text-zinc-600">Current backup status</p>
              </div>
              <ShieldIcon size={17} className="text-violet-200/70" />
            </div>
            <div className="mt-5">
              <PostureRow label="Active vaults" value={activeVaults.length} tone="emerald" />
              <PostureRow label="Recovery in progress" value={recoveringVaults.length} tone="cyan" />
              <PostureRow label="Locked vaults" value={lockedVaults.length} tone="red" />
              <PostureRow label="Encrypted backups" value={cdrVaults.length} tone="violet" />
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.025] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="ny-heading text-base">Recent activity</h3>
                <p className="mt-1 text-xs text-zinc-600">Latest saved vaults</p>
              </div>
              <ClockIcon size={17} className="text-violet-200/70" />
            </div>
            {recentVaults.length === 0 ? (
              <div className="mt-5 rounded-xl bg-black/18 p-4 text-sm text-zinc-500">
                No vault activity yet.
              </div>
            ) : (
              <div className="mt-5">
                {recentVaults.map((vault) => (
                  <Link
                    key={vault.id}
                    href={`/vault/${vault.id}`}
                    className="ny-list-row flex items-center justify-between gap-3 py-3 text-sm text-zinc-400 transition hover:text-zinc-200"
                  >
                    <span className="text-sm text-zinc-300">{vault.name?.trim() || 'Untitled vault'}</span>
                    <span className="shrink-0 text-xs text-zinc-600">
                      {new Date(vault.createdAt).toLocaleDateString()}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-gradient-to-b from-violet-500/[0.08] to-white/[0.025] p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-violet-400/10 text-violet-200">
                <KeyIcon size={17} />
              </div>
              <div>
                <h3 className="ny-heading text-base">Trusted contacts</h3>
                <p className="mt-1 text-xs text-zinc-500">Manage recovery access per vault.</p>
              </div>
            </div>
            <Link href="/recover" className="mt-5 inline-flex text-sm font-medium text-violet-200 transition hover:text-white">
              Open recovery
            </Link>
          </div>
        </div>
      </section>

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => {
              if (!confirmingDelete) setPendingDelete(null);
            }}
          />
          <div className="ny-modal relative z-10 w-full max-w-md rounded-2xl p-6">
            <p className="ny-label">Confirm deletion</p>
            <h3 className="ny-heading mt-2 text-xl">Delete this vault?</h3>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              This removes the vault from your Nythera dashboard. On-chain history may still exist.
            </p>
            <div className="mt-4 rounded-xl bg-black/22 p-3">
              <p className="text-sm text-zinc-300">{pendingDelete.name?.trim() || 'Untitled vault'}</p>
              {pendingDelete.cdr?.uuid && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-zinc-500">Advanced details</summary>
                  <p className="mt-1 text-xs text-zinc-600">Vault ID {pendingDelete.cdr.uuid}</p>
                </details>
              )}
            </div>
            <div className="mt-4">
              <label className="mb-1 block font-mono text-xs text-zinc-400">Type DELETE to confirm</label>
              <input
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
                className="ny-input px-3 py-2 font-mono text-sm"
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>
            {signatureChecksum && (
              <div className="ny-success-surface mt-4 inline-flex items-center gap-2 rounded-lg border px-3 py-2">
                <SuccessMotion label="Signature captured" size="sm" />
                <span className="font-mono text-[11px] text-zinc-400">{signatureChecksum}</span>
              </div>
            )}
            {deleteError && <p className="mt-3 text-sm text-red-300">{deleteError}</p>}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={confirmingDelete}
                className="ny-button-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteVault(pendingDelete)}
                disabled={confirmingDelete || deleteConfirmText.trim() !== 'DELETE'}
                className="ny-button-danger"
              >
                {confirmingDelete ? 'Verifying...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardMetric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: 'emerald' | 'violet' | 'cyan' | 'amber';
}) {
  const toneMap = {
    emerald: 'bg-emerald-300',
    violet: 'bg-violet-300',
    cyan: 'bg-cyan-300',
    amber: 'bg-amber-300',
  };

  return (
    <div className="rounded-xl bg-black/18 p-4 transition duration-200 hover:bg-black/24">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        <span className={`h-1.5 w-1.5 rounded-full ${toneMap[tone]}`} />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-600">{detail}</p>
    </div>
  );
}

function PostureRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'emerald' | 'cyan' | 'red' | 'violet';
}) {
  const toneMap = {
    emerald: 'bg-emerald-300',
    cyan: 'bg-cyan-300',
    red: 'bg-red-300',
    violet: 'bg-violet-300',
  };

  return (
    <div className="ny-list-row flex items-center justify-between gap-3 py-3 text-sm">
      <span className="inline-flex items-center gap-2 text-zinc-500">
        <span className={`h-1.5 w-1.5 rounded-full ${toneMap[tone]}`} />
        {label}
      </span>
      <span className="font-mono text-xs text-zinc-200">{value}</span>
    </div>
  );
}

function storageCreditsKnownLow(balance: number | null, requiredForUpload: number): boolean {
  return typeof balance === 'number' && balance < requiredForUpload;
}

function EmptyVaultState() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-black/18 p-8">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_50%_50%,rgba(124,92,255,0.13),transparent_58%)]" />
      <div className="relative grid gap-8 lg:grid-cols-[220px_1fr] lg:items-center">
        <div className="relative mx-auto aspect-square w-44">
          <div className="absolute inset-4 rounded-full border border-white/[0.06]" />
          <div className="absolute inset-10 rounded-full border border-violet-300/15" />
          <div className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl bg-violet-400/10 text-violet-200">
            <VaultIcon size={26} />
          </div>
          <span className="absolute left-5 top-8 h-2 w-2 rounded-full bg-violet-300/70" />
          <span className="absolute bottom-9 right-7 h-2 w-2 rounded-full bg-cyan-300/70" />
          <span className="absolute bottom-14 left-9 h-1.5 w-1.5 rounded-full bg-emerald-300/70" />
        </div>
        <div>
          <p className="ny-label">No vaults detected</p>
          <h3 className="ny-heading mt-2 text-xl">Initialize your first recovery vault</h3>
          <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-500">
            Create an encrypted CDR-backed record, assign guardians, and establish a recoverable path for critical wallet access.
          </p>
          <p className="mt-5 text-sm text-zinc-500">
            Use the global <span className="text-zinc-300">Create Vault</span> action in the command bar to begin.
          </p>
          <div className="mt-6 grid gap-2 text-xs text-zinc-600 sm:grid-cols-3">
            <span className="inline-flex items-center gap-1.5">
              <LockIcon size={13} />
              Client encrypted
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ChainIcon size={13} />
              CDR stored
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldIcon size={13} />
              Guardian gated
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SyncingVaultState() {
  return (
    <div className="rounded-2xl bg-black/18 p-8">
      <p className="ny-label">Syncing vault records</p>
      <h3 className="ny-heading mt-2 text-xl">Checking durable storage</h3>
      <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-500">
        Looking up CDR vault metadata saved for this wallet.
      </p>
    </div>
  );
}
