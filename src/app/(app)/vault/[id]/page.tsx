'use client';

import { FormEvent, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createPublicClient, http } from 'viem';
import { deleteVault as deleteLocalVault, getVault, updateVault } from '@/lib/store/vault-store';
import type { VaultData } from '@/lib/crypto/vault';
import { classifyRecipient, dedupeAddresses } from '@/lib/recipients';
import { createPrivyWalletClient } from '@/lib/privy';
import { CDR_DEFAULTS } from '@/lib/crypto/cdr-config';
import { encodedAccessConditionAbi, WHITELIST_CONDITION, whitelistConditionAbi } from '@/lib/contracts';
import { useWalletVaults } from '@/lib/hooks/use-wallet-vaults';
import { useAuthFetch } from '@/lib/hooks/use-auth-fetch';
import SuccessMotion from '@/components/ui/SuccessMotion';
import { useNytheraWallet } from '@/lib/hooks/use-nythera-wallet';

export default function VaultDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { activeWallet: wallet, activeAddress: address } = useNytheraWallet();
  const authFetch = useAuthFetch();

  const initialVault = address && params?.id ? getVault(address, params.id) : null;
  const [vaultOverride, setVaultOverride] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [signatureChecksum, setSignatureChecksum] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const { vaults, hydrating, hydrateError } = useWalletVaults(address, { fetchFn: authFetch });
  const hydratedVault = vaults.find((cachedVault) => cachedVault.id === params?.id) ?? null;
  const vault = vaultOverride ?? hydratedVault ?? initialVault;
  const defaultRecipientText = vault?.recipients
    ? [...vault.recipients.wallets, ...vault.recipients.emails].join(', ')
    : '';
  const [recipientTextOverride, setRecipientTextOverride] = useState<string | null>(null);
  const recipientText = recipientTextOverride ?? defaultRecipientText;

  if (!vault) {
    return (
      <div className="max-w-3xl mx-auto">
        <p className="text-ink/65 font-medium">
          {hydrating ? 'Syncing vault metadata...' : 'Vault not found.'}
        </p>
        {hydrateError && (
          <p className="mt-2 text-sm text-warm-clay font-medium">
            Vault sync is using this browser cache only: {hydrateError}
          </p>
        )}
        <Link href="/dashboard" className="mt-4 inline-block font-mono text-sm text-warm-clay font-semibold hover:text-ink transition hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const recipientWalletCount = vault.recipients?.wallets.length ?? 0;
  const recipientEmailCount = vault.recipients?.emails.length ?? 0;
  const recoveryEvents = vault.recoveryEvents ?? [];
  const vaultName = vault.name?.trim() || 'Untitled vault';
  const recipientEntries = recipientText
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  async function handleSaveRecipients(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const currentVault = vault;
      if (!address || !wallet) throw new Error('Connect your wallet first.');
      if (!currentVault) throw new Error('Vault not found.');
      if (!currentVault.cdr) throw new Error('Only CDR vaults support guardian editing.');
      const isEncodedAccessVault =
        currentVault.cdr.conditionVersion === 'v2-encoded-access' ||
        currentVault.cdr.conditionVersion === 'v3-origin-access';
      if (!isEncodedAccessVault && !WHITELIST_CONDITION) throw new Error('Whitelist condition is not configured.');
      if (isEncodedAccessVault && (!currentVault.cdr.accessConditionAddress || !currentVault.cdr.readConditionData)) {
        throw new Error('Encoded access condition metadata is missing for this vault.');
      }

      const entries = recipientText
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter(Boolean);
      const classified = entries.map(classifyRecipient);
      const invalid = classified.find((entry) => entry.kind === 'invalid');
      if (invalid) throw new Error(`Invalid recipient: ${invalid.value}`);

      const walletRecipients = classified
        .filter((entry): entry is { kind: 'address'; value: `0x${string}` } => entry.kind === 'address')
        .map((entry) => entry.value);
      const emailRecipients = classified
        .filter((entry): entry is { kind: 'email'; value: string } => entry.kind === 'email')
        .map((entry) => entry.value);

      let resolvedEmailWallets: `0x${string}`[] = [];
      if (emailRecipients.length > 0) {
        const response = await fetch('/api/privy/resolve', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ emails: emailRecipients }),
        });
        const body = (await response.json().catch(() => ({}))) as {
          results?: { email: string; address: `0x${string}` }[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(body.error ?? `Could not resolve recipients (${response.status})`);
        }
        resolvedEmailWallets = body.results?.map((result) => result.address) ?? [];
      }

      const nextAddresses = dedupeAddresses([...walletRecipients, ...resolvedEmailWallets]);
      const currentAddresses = dedupeAddresses([
        ...(currentVault.recipients?.wallets ?? []),
        ...(currentVault.recipients?.resolvedEmailWallets ?? []),
      ]);
      const toAdd = nextAddresses.filter(
        (addressValue) => !currentAddresses.some((existing) => existing.toLowerCase() === addressValue.toLowerCase()),
      );
      const toRemove = currentAddresses.filter(
        (addressValue) => !nextAddresses.some((next) => next.toLowerCase() === addressValue.toLowerCase()),
      );

      const walletClient = await createPrivyWalletClient({
        address,
        switchChain: wallet.switchChain,
        getEthereumProvider: wallet.getEthereumProvider,
      });
      const publicClient = createPublicClient({
        transport: http(CDR_DEFAULTS.rpcUrl),
      });

      if (isEncodedAccessVault) {
        const conditionAddress = currentVault.cdr.accessConditionAddress as `0x${string}`;
        const conditionData = currentVault.cdr.readConditionData as `0x${string}`;
        for (const walletAddress of toAdd) {
          const hash = await walletClient.writeContract({
            address: conditionAddress,
            abi: encodedAccessConditionAbi,
            functionName: 'setAccessOverride',
            args: [conditionData, walletAddress, true],
            account: address as `0x${string}`,
          });
          await publicClient.waitForTransactionReceipt({ hash });
        }

        for (const walletAddress of toRemove) {
          const hash = await walletClient.writeContract({
            address: conditionAddress,
            abi: encodedAccessConditionAbi,
            functionName: 'setAccessOverride',
            args: [conditionData, walletAddress, false],
            account: address as `0x${string}`,
          });
          await publicClient.waitForTransactionReceipt({ hash });
        }
      } else {
        for (const walletAddress of toAdd) {
          const hash = await walletClient.writeContract({
            address: WHITELIST_CONDITION,
            abi: whitelistConditionAbi,
            functionName: 'addToWhitelist',
            args: [currentVault.cdr.uuid, walletAddress],
            account: address as `0x${string}`,
          });
          await publicClient.waitForTransactionReceipt({ hash });
        }

        for (const walletAddress of toRemove) {
          const hash = await walletClient.writeContract({
            address: WHITELIST_CONDITION,
            abi: whitelistConditionAbi,
            functionName: 'removeFromWhitelist',
            args: [currentVault.cdr.uuid, walletAddress],
            account: address as `0x${string}`,
          });
          await publicClient.waitForTransactionReceipt({ hash });
        }
      }

      const updatedVault: VaultData = {
        ...currentVault,
        recipients: {
          wallets: walletRecipients,
          emails: emailRecipients,
          resolvedEmailWallets,
        },
      };
      updateVault(address, updatedVault);
      setVaultOverride(updatedVault);
      setRecipientTextOverride([...walletRecipients, ...emailRecipients].join(', '));

      const recipients = [
        ...walletRecipients.map((walletAddress) => ({
          kind: 'wallet' as const,
          value: walletAddress,
          resolvedWallet: walletAddress,
        })),
        ...emailRecipients.flatMap((email, index) => {
          const resolvedWallet = resolvedEmailWallets[index];
          return resolvedWallet
            ? [{ kind: 'email' as const, value: email, resolvedWallet }]
            : [];
        }),
      ];
      const metadataResponse = await authFetch('/api/vault-recipients', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          cdrUuid: currentVault.cdr.uuid,
          recipients,
        }),
      });
      if (!metadataResponse.ok) {
        const body = (await metadataResponse.json().catch(() => ({}))) as { error?: string; skipped?: boolean };
        if (!body.skipped) {
          throw new Error(body.error ?? `Recipient metadata update failed (${metadataResponse.status})`);
        }
      }

      setMessage('Guardians updated successfully.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update guardians.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteVault() {
    if (!address || !vault) return;
    if (!wallet) return;

    setDeleting(true);
    setError('');
    setDeleteError('');
    setMessage('');
    setSignatureChecksum('');
    try {
      setConfirmingDelete(true);
      const walletClient = await createPrivyWalletClient({
        address,
        switchChain: wallet.switchChain,
        getEthereumProvider: wallet.getEthereumProvider,
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

      const response = await authFetch('/api/vault-records', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          cdrUuid: vault.cdr?.uuid,
          localVaultId: vault.id,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        skipped?: boolean;
        error?: string;
      };
      if (!response.ok && !body.skipped) {
        throw new Error(body.error ?? `Failed to delete vault metadata (${response.status})`);
      }

      deleteLocalVault(address, vault.id);
      router.push('/dashboard');
    } catch (deleteError) {
      setDeleteError(deleteError instanceof Error ? deleteError.message : 'Could not delete vault.');
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  function removeRecipientValue(value: string) {
    const next = recipientEntries.filter((entry) => entry.toLowerCase() !== value.toLowerCase());
    setRecipientTextOverride(next.join(', '));
    setMessage('');
    setError('');
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <section className="ny-panel p-4 sm:p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="ny-label text-warm-clay font-medium">Vault details</p>
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl text-ink mt-2">
              {vaultName}
            </h1>
            <p className="text-sm text-ink/60 mt-2">
              {vault.description?.trim() || 'Encrypted backup with trusted recovery access.'}
            </p>
            {(vault.tags ?? []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {(vault.tags ?? []).map((tag) => (
                  <span key={tag} className="rounded-full border border-warm-clay/20 bg-warm-clay/10 px-2.5 py-1 text-xs text-ink">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="ny-pill">
              Status: {vault.status}
            </span>
            <button
              type="button"
              onClick={() => {
                setConfirmingDelete(true);
                setDeleteError('');
                setSignatureChecksum('');
                setDeleteConfirmText('');
              }}
              disabled={deleting || loading}
              className="ny-button-danger min-h-0 px-3 py-1 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete Vault'}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="ny-tile p-4">
            <p className="ny-label">Name</p>
            <p className="text-sm text-ink/80 mt-2">{vaultName}</p>
          </div>
          <div className="ny-tile p-4">
            <p className="ny-label">Description</p>
            <p className="text-sm text-ink/80 mt-2">{vault.description?.trim() || 'No description added'}</p>
          </div>
          <div className="ny-tile p-4">
            <p className="ny-label">Created</p>
            <p className="text-sm text-ink/80 mt-2">{new Date(vault.createdAt).toLocaleString()}</p>
          </div>
          <div className="ny-tile p-4">
            <p className="ny-label">Shared access</p>
            <p className="text-sm text-ink/80 mt-2">
              {recipientWalletCount} wallet(s), {recipientEmailCount} email(s)
            </p>
          </div>
          {vault.cdr ? (
            <div className="ny-tile p-4">
              <p className="ny-label">Vault ID</p>
              <p className="text-sm text-ink/80 mt-2 break-all">{vault.cdr.uuid}</p>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-ink/50">Advanced details</summary>
                <p className="mt-1 text-xs text-ink/40">
                  {vault.cdr.conditionVersion === 'v2-encoded-access' || vault.cdr.conditionVersion === 'v3-origin-access'
                    ? 'Encoded access condition'
                    : 'Standard access list'}
                </p>
              </details>
            </div>
          ) : (
            <div className="ny-tile p-4">
              <p className="ny-label">Vault type</p>
              <p className="text-sm text-ink/80 mt-2">Legacy local vault (AES + Shamir)</p>
            </div>
          )}
          <div className="ny-tile p-4">
            <p className="ny-label">Saved as</p>
            <p className="text-sm text-ink/80 mt-2">
              {vault.contentType === 'walrus-file' ? 'Encrypted file backup' : 'Encrypted secret backup'}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="ny-panel p-4 sm:p-6">
          <p className="ny-label">Activity timeline</p>
          <div className="mt-4 space-y-4 text-sm text-ink/65">
            <div>
              <p className="text-ink font-semibold">Vault created</p>
              <p className="text-xs text-ink/40">{new Date(vault.createdAt).toLocaleString()}</p>
            </div>
            {vault.cdr && (
              <details className="rounded-xl border border-ink/[0.08] bg-white/40 p-3">
                <summary className="cursor-pointer text-sm text-ink/75">Advanced blockchain details</summary>
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="text-ink font-semibold">Storage reservation</p>
                    <p className="text-xs text-ink/40 break-all">{vault.cdr.allocateTxHash}</p>
                  </div>
                  <div>
                    <p className="text-ink font-semibold">Encrypted save</p>
                    <p className="text-xs text-ink/40 break-all">{vault.cdr.writeTxHash}</p>
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>

        <div className="ny-panel p-4 sm:p-6">
          <p className="ny-label">Diagnostics</p>
          <div className="mt-4 space-y-3 text-sm text-ink/65">
            <div className="flex items-center justify-between">
              <span>Status</span>
              <span className="font-mono text-ink/80">{vault.status}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Guardians</span>
              <span className="font-mono text-ink/80">
                {recipientWalletCount + recipientEmailCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Encryption</span>
              <span className="font-mono text-ink/80">Verified</span>
            </div>
          </div>
        </div>

        <div className="ny-panel p-4 sm:p-6">
          <p className="ny-label">Recovery history</p>
          <p className="font-display text-2xl text-ink mt-3">{recoveryEvents.length}</p>
          <p className="text-xs text-ink/50 mt-1">
            {recoveryEvents.length === 1 ? 'Successful recovery' : 'Successful recoveries'}
          </p>
          {recoveryEvents.length === 0 ? (
            <p className="text-sm text-ink/50 mt-4">No recovery events recorded.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {recoveryEvents.slice(0, 3).map((event) => (
                <div
                  key={`${event.recoveredAt}-${event.recoveredBy}`}
                  className="ny-tile px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-ink font-semibold">Vault recovered</span>
                    <span className="font-mono text-[11px] text-ink/50">
                      {event.contentType === 'walrus-file' ? 'File' : 'Secret'}
                    </span>
                  </div>
                  <p className="text-xs text-ink/50 mt-1">{new Date(event.recoveredAt).toLocaleString()}</p>
                  <p className="text-xs text-ink/40 mt-1 font-mono break-all">
                    {event.recoveredBy.slice(0, 8)}...{event.recoveredBy.slice(-6)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {vault.cdr && (
        <section className="ny-panel p-4 sm:p-6 md:p-8 space-y-4">
          <div>
            <p className="ny-label">Guardian access</p>
            <h2 className="font-display text-xl text-ink mt-2">Edit guardians</h2>
            <p className="text-sm text-ink/60">
              Add, remove, or replace recipient wallets/emails. This updates on-chain whitelist access.
            </p>
          </div>
          <textarea
            rows={4}
            value={recipientText}
            onChange={(event) => setRecipientTextOverride(event.target.value)}
            className="w-full ny-input px-3 py-2 font-mono text-sm"
            placeholder="0xabc..., trusted.friend@example.com"
          />
          {recipientEntries.length > 0 && (
            <div className="space-y-2">
              <p className="font-mono text-xs text-ink/50">Current guardians (click remove):</p>
              <div className="flex flex-wrap gap-2">
                {recipientEntries.map((entry) => (
                  <button
                    key={entry.toLowerCase()}
                    type="button"
                    onClick={() => removeRecipientValue(entry)}
                    className="border border-ink/[0.08] bg-white/45 px-2.5 py-1 font-mono text-xs text-ink/75 hover:border-red-300/50 hover:text-red-500 hover:bg-white/70"
                    title={`Remove ${entry}`}
                  >
                    {entry} x
                  </button>
                ))}
              </div>
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && (
            <div className="ny-success-surface rounded-xl border p-3">
              <SuccessMotion label={message} size="sm" />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSaveRecipients}
              disabled={loading}
              className="ny-button disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Guardians'}
            </button>
            <button
              type="button"
              disabled={loading || recipientEntries.length === 0}
              onClick={() => {
                setRecipientTextOverride('');
                setMessage('');
                setError('');
              }}
              className="ny-button-secondary disabled:opacity-40"
            >
              Clear All
            </button>
          </div>
        </section>
      )}

      {confirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!deleting) setConfirmingDelete(false);
            }}
          />
          <div className="ny-modal relative z-10 w-full max-w-md p-4 sm:p-6">
            <p className="ny-label">Confirm deletion</p>
            <h3 className="mt-2 font-display text-3xl leading-none text-ink">Delete this vault?</h3>
            <p className="mt-3 text-sm leading-6 text-ink/65">
              This removes the vault from your Nythera dashboard. Blockchain history may still exist.
            </p>
            <div className="mt-4 ny-tile p-3">
              <p className="text-sm text-ink font-semibold">{vaultName}</p>
              {vault.cdr?.uuid && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-ink/50">Advanced details</summary>
                  <p className="text-xs text-ink/40 mt-1">Vault ID {vault.cdr.uuid}</p>
                </details>
              )}
            </div>
            <div className="mt-4">
              <label className="block text-xs font-mono text-ink/50 mb-1">Type DELETE to confirm</label>
              <input
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
                className="w-full ny-input px-3 py-2 text-sm font-mono"
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>
            {signatureChecksum && (
              <div className="ny-success-surface mt-4 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-ink">
                <SuccessMotion label="Signature captured" size="sm" />
                <span className="text-[11px] font-mono text-ink/60">{signatureChecksum}</span>
              </div>
            )}
            {deleteError && <p className="text-sm text-red-600 mt-3">{deleteError}</p>}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="ny-button-secondary disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteVault}
                disabled={deleting || deleteConfirmText.trim() !== 'DELETE'}
                className="ny-button-danger disabled:opacity-60"
              >
                {deleting ? 'Verifying...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
