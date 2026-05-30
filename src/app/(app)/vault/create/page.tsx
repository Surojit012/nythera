'use client';

import { FormEvent, useMemo, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { useRouter } from 'next/navigation';
import { createCDRClient } from '@/lib/crypto/cdr';
import { CDR_DEFAULTS } from '@/lib/crypto/cdr-config';
import { createVaultWithCDR } from '@/lib/crypto/vault';
import { saveVault } from '@/lib/store/vault-store';
import { createPrivyWalletClient } from '@/lib/privy';
import { classifyRecipient, dedupeAddresses } from '@/lib/recipients';
import { WHITELIST_CONDITION } from '@/lib/contracts';
import { useStorageCredits } from '@/lib/hooks/use-storage-credits';
import { useAuthFetch } from '@/lib/hooks/use-auth-fetch';
import {
  encryptFileForWalrus,
  exactArrayBuffer,
  MAX_WALRUS_FILE_BYTES,
  MAX_WALRUS_FILE_LABEL,
  type WalrusFilePayload,
} from '@/lib/crypto/file/walrus-file';
import type { RenewalMode } from '@/lib/supabase/vault-records';
import StepWizard from '@/components/app/StepWizard';
import { EyeIcon, KeyIcon, LockIcon, ShieldIcon, VaultIcon, WalletIcon } from '@/components/ui/Icons';
import SuccessMotion from '@/components/ui/SuccessMotion';
import { useNytheraWallet } from '@/lib/hooks/use-nythera-wallet';

type ResolveResponse = {
  results?: { email: string; address: `0x${string}` }[];
  error?: string;
};

type WalrusUploadResponse = {
  blobId: string;
  objectId?: string;
  startEpoch?: number;
  endEpoch?: number;
  endDate?: string;
  error?: string;
};

type FormattedError = {
  summary: string;
  details?: string;
};

type CreateProgressStage = 'idle' | 'preparing' | 'allocating' | 'registering' | 'encrypting' | 'writing' | 'saving' | 'complete';
type SecretType = 'seed' | 'private-key' | 'password' | 'note' | 'file';

const presetTags = ['personal', 'family', 'work', 'hardware wallet', 'exchange', 'DeFi', 'testnet'];

const secretCards: Array<{
  type: SecretType;
  title: string;
  description: string;
  icon: typeof ShieldIcon;
}> = [
  {
    type: 'seed',
    title: 'Seed Phrase',
    description: 'Best for a 12-word or 24-word wallet recovery phrase.',
    icon: ShieldIcon,
  },
  {
    type: 'private-key',
    title: 'Private Key',
    description: 'Save a single wallet private key that starts with 0x.',
    icon: KeyIcon,
  },
  {
    type: 'password',
    title: 'Wallet Password / PIN',
    description: 'Store a password, PIN, or unlock hint for an emergency.',
    icon: LockIcon,
  },
  {
    type: 'note',
    title: 'Custom Note',
    description: 'Write instructions, exchange hints, or family guidance.',
    icon: VaultIcon,
  },
  {
    type: 'file',
    title: 'File Backup',
    description: `Encrypt and save an image, PDF, or text file under ${MAX_WALRUS_FILE_LABEL}.`,
    icon: WalletIcon,
  },
];

const createProgressCopy: Record<CreateProgressStage, string> = {
  idle: '',
  preparing: 'Preparing your encrypted backup in this browser.',
  allocating: 'Wallet confirmation 1 of 3: reserve a safe place for this vault.',
  registering: 'Wallet confirmation 2 of 3: allow your trusted contacts to recover it.',
  encrypting: 'Encrypting your secret before anything leaves this browser.',
  writing: 'Wallet confirmation 3 of 3: save the encrypted vault to blockchain storage.',
  saving: 'Saving the vault name and tags to your dashboard.',
  complete: 'Vault created. Taking you back to the dashboard.',
};

function formatCreateError(rawError: string): FormattedError {
  if (!rawError) return { summary: '' };
  const trimmed = rawError.trim();
  const lower = trimmed.toLowerCase();

  if (lower.includes('user rejected') || lower.includes('user denied')) {
    return {
      summary: 'You canceled the wallet confirmation. No vault was created.',
      details: trimmed,
    };
  }

  if (lower.includes('insufficient funds')) {
    return {
      summary: 'This wallet needs more gas to finish saving the vault.',
      details: trimmed,
    };
  }

  if (lower.includes('insufficient storage credits') || lower.includes('storage credits')) {
    return {
      summary: 'Not enough storage credits for this file backup.',
      details: trimmed,
    };
  }

  if (lower.includes('cdr write') || lower.includes('write condition') || lower.includes('transaction failed')) {
    return {
      summary: "Couldn't save to blockchain - try again.",
      details: trimmed,
    };
  }

  if (lower.includes('timeout') || lower.includes('timed out')) {
    return {
      summary: 'The network took too long to respond. Please try again.',
      details: trimmed,
    };
  }

  const requestIndex = trimmed.indexOf('Request Arguments');
  if (requestIndex > 0) {
    return {
      summary: trimmed.slice(0, requestIndex).trim(),
      details: trimmed.slice(requestIndex).trim(),
    };
  }

  return { summary: trimmed };
}

function normalizeTag(tag: string): string {
  return tag.trim().replace(/\s+/g, ' ').slice(0, 28);
}

function isPrivateKey(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value.trim());
}

function passwordStrength(value: string): { label: string; tone: string; score: number } {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 14) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (score >= 4) return { label: 'Strong', tone: 'bg-emerald-300', score };
  if (score >= 2) return { label: 'Okay', tone: 'bg-amber-300', score };
  return { label: value ? 'Weak' : 'Not started', tone: 'bg-zinc-600', score };
}

function fileSizeLabel(file: File): string {
  return `${(file.size / 1024 / 1024).toFixed(2)} MB`;
}

export default function CreateVaultPage() {
  const { activeWallet: wallet, activeAddress: address } = useNytheraWallet();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const storageCredits = useStorageCredits(address, { fetchFn: authFetch });
  const [vaultName, setVaultName] = useState('');
  const [vaultDescription, setVaultDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [secretType, setSecretType] = useState<SecretType>('seed');
  const [seedWordCount, setSeedWordCount] = useState<12 | 24>(12);
  const [seedWords, setSeedWords] = useState<string[]>(Array(24).fill(''));
  const [privateKey, setPrivateKey] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [recipients, setRecipients] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileNote, setFileNote] = useState('');
  const [draggingFile, setDraggingFile] = useState(false);
  const [renewalMode, setRenewalMode] = useState<RenewalMode>('notify');
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progressStage, setProgressStage] = useState<CreateProgressStage>('idle');
  const [error, setError] = useState('');
  const formattedError = formatCreateError(error);
  const strength = passwordStrength(password);

  const steps = useMemo(
    () => [
      { title: 'What to save', description: 'Name it and choose the secret type' },
      { title: 'Trusted contacts', description: 'Who can recover it' },
      { title: 'Safety', description: 'Review recovery settings' },
      { title: 'Finish', description: 'Encrypt and save' },
    ],
    [],
  );

  const normalizedVaultName = vaultName.trim();
  const normalizedDescription = vaultDescription.trim();
  const activeSeedWords = seedWords.slice(0, seedWordCount).map((word) => word.trim());
  const seedValid = activeSeedWords.every(Boolean);
  const passwordValid = Boolean(password) && password === confirmPassword;
  const secretValidation = getSecretValidation();
  const storageCreditsRequired = storageCredits.requiredForUpload;
  const storageCreditsBalance = storageCredits.balance;
  const storageCreditsKnown = typeof storageCreditsBalance === 'number';
  const hasEnoughStorageCredits =
    secretType !== 'file' ||
    storageCredits.skipped ||
    !storageCreditsKnown ||
    storageCreditsBalance >= storageCreditsRequired;
  const step0Valid = Boolean(normalizedVaultName) && secretValidation.valid && hasEnoughStorageCredits;
  const additionalGuardians = recipients.trim()
    ? recipients.split(/[\n,]/).map((entry) => entry.trim()).filter(Boolean).length
    : 0;

  function getSecretValidation(): { valid: boolean; message: string } {
    if (secretType === 'seed') {
      return {
        valid: seedValid,
        message: seedValid ? '' : `Fill all ${seedWordCount} seed phrase words before continuing.`,
      };
    }
    if (secretType === 'private-key') {
      return {
        valid: isPrivateKey(privateKey),
        message: 'Enter a private key in 0x format.',
      };
    }
    if (secretType === 'password') {
      return {
        valid: passwordValid,
        message: password ? 'Make sure both password fields match.' : 'Enter the password or PIN to save.',
      };
    }
    if (secretType === 'note') {
      return {
        valid: Boolean(customNote.trim()),
        message: 'Write the note you want to save.',
      };
    }
    return {
      valid: Boolean(file),
      message: 'Choose a file to back up.',
    };
  }

  function addTag(value: string) {
    const normalized = normalizeTag(value);
    if (!normalized) return;
    setTags((current) => {
      if (current.some((tag) => tag.toLowerCase() === normalized.toLowerCase())) return current;
      if (current.length >= 5) return current;
      return [...current, normalized];
    });
    setCustomTag('');
  }

  function removeTag(value: string) {
    setTags((current) => current.filter((tag) => tag.toLowerCase() !== value.toLowerCase()));
  }

  function setSeedWord(index: number, value: string) {
    const next = [...seedWords];
    next[index] = value.toLowerCase().replace(/[^a-z]/g, '');
    setSeedWords(next);
  }

  function setSelectedFile(nextFile: File | null) {
    if (nextFile && nextFile.size > MAX_WALRUS_FILE_BYTES) {
      setError(`Choose a file under ${MAX_WALRUS_FILE_LABEL}. Larger files exceed the current upload limit.`);
      setFile(null);
      return;
    }
    setError('');
    setFile(nextFile);
  }

  function buildSecretPayload(): string {
    if (secretType === 'seed') return activeSeedWords.join(' ');
    if (secretType === 'private-key') return privateKey.trim();
    if (secretType === 'password') return password;
    if (secretType === 'note') return customNote.trim();
    return '';
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    setProgressStage('idle');

    if (!address || !wallet) {
      setError('Connect your wallet first.');
      return;
    }
    if (!normalizedVaultName) {
      setError('Name this vault before creating it.');
      return;
    }
    if (normalizedDescription.length > 120) {
      setError('Keep the description under 120 characters.');
      return;
    }
    if (!secretValidation.valid) {
      setError(secretValidation.message);
      return;
    }
    if (!WHITELIST_CONDITION) {
      setError('Recovery access is not configured yet.');
      return;
    }
    if (secretType === 'file' && storageCreditsKnown && storageCreditsBalance < storageCreditsRequired) {
      setError(
        `Insufficient storage credits. This file backup needs ${storageCreditsRequired} credits, but this wallet has ${storageCreditsBalance}. Ask the admin to add storage credits before creating a file backup.`,
      );
      return;
    }
    setLoading(true);
    try {
      setProgressStage('preparing');
      const entries = recipients
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter(Boolean);
      const classified = entries.map(classifyRecipient);
      const invalid = classified.find((entry) => entry.kind === 'invalid');
      if (invalid) {
        throw new Error(`Invalid contact: ${invalid.value}`);
      }

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
        const body = (await response.json().catch(() => ({}))) as ResolveResponse;
        if (!response.ok) {
          throw new Error(body.error ?? `Could not prepare email contacts (${response.status})`);
        }
        resolvedEmailWallets = body.results?.map((result) => result.address) ?? [];
      }

      const recipientAddresses = dedupeAddresses([...walletRecipients, ...resolvedEmailWallets]);
      const walletClient = await createPrivyWalletClient({
        address,
        switchChain: wallet.switchChain,
        getEthereumProvider: wallet.getEthereumProvider,
      });
      const publicClient = createPublicClient({
        transport: http(CDR_DEFAULTS.rpcUrl),
      });

      const cdrClient = await createCDRClient({
        network: CDR_DEFAULTS.network,
        apiUrl: CDR_DEFAULTS.apiUrl,
        publicClient,
        walletClient,
      });

      const filePayload = secretType === 'file' && file
        ? await prepareWalrusFilePayload(file, address, renewalMode, fileNote, storageCreditsRequired, authFetch)
        : null;
      const cdrPayload = filePayload ? JSON.stringify(filePayload) : buildSecretPayload();

      const { vault } = await createVaultWithCDR(cdrPayload, address, [], {
        client: cdrClient,
        publicClient,
        walletClient,
        onProgress: setProgressStage,
        recipientAddresses,
        recipientEmails: emailRecipients,
        resolvedEmailWallets,
        accessConditionAddress: undefined,
        accessConditionVersion: undefined,
        whitelistConditionAddress: WHITELIST_CONDITION,
        contentType: filePayload ? 'walrus-file' : 'text',
        walrus: filePayload
          ? {
            blobId: filePayload.blobId,
            objectId: filePayload.objectId,
            fileName: filePayload.fileName,
            fileSize: filePayload.fileSize,
            mimeType: filePayload.mimeType,
            endEpoch: filePayload.endEpoch,
            endDate: filePayload.endDate,
            renewalMode: filePayload.renewalMode,
          }
          : undefined,
      });
      vault.name = normalizedVaultName;
      vault.description = normalizedDescription || undefined;
      vault.tags = tags;

      setProgressStage('saving');
      await persistVaultRecord({
        vault,
        address,
        vaultName: normalizedVaultName,
        vaultDescription: normalizedDescription,
        vaultTags: tags,
        contentType: filePayload ? 'walrus-file' : 'text',
        filePayload,
        walletRecipients,
        emailRecipients,
        resolvedEmailWallets,
        fetchFn: authFetch,
      });

      saveVault(address, vault);
      await storageCredits.refresh();
      setProgressStage('complete');
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create this vault.');
    } finally {
      setLoading(false);
      setProgressStage('idle');
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <form onSubmit={handleCreate} className="ny-panel space-y-8 p-3 sm:p-5 md:p-8">
        <StepWizard steps={steps} currentStep={currentStep} onStepChange={setCurrentStep} showNavigation={false}>
          {currentStep === 0 && (
            <div className="space-y-7">
              <div className="grid gap-4 md:grid-cols-[1fr_1.1fr]">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink/75">Vault name</label>
                  <input
                    value={vaultName}
                    onChange={(event) => setVaultName(event.target.value)}
                    className="ny-input w-full px-3 py-2"
                    placeholder="e.g. Main MetaMask wallet"
                    maxLength={80}
                  />
                  <p className="mt-1 text-xs text-ink/50">Required. Use a name your family or team will recognize.</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink/75">Description</label>
                  <input
                    value={vaultDescription}
                    onChange={(event) => setVaultDescription(event.target.value.slice(0, 120))}
                    className="ny-input w-full px-3 py-2"
                    placeholder="e.g. My main wallet - for family emergency access"
                    maxLength={120}
                  />
                  <p className="mt-1 text-xs text-ink/50">{120 - vaultDescription.length} characters left.</p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink/50">Tags</p>
                  <p className="text-xs text-ink/50">{tags.length}/5 selected</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {presetTags.map((tag) => {
                    const selected = tags.some((selectedTag) => selectedTag.toLowerCase() === tag.toLowerCase());
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => selected ? removeTag(tag) : addTag(tag)}
                        disabled={!selected && tags.length >= 5}
                        className={`rounded-full border px-3 py-1 text-xs transition disabled:opacity-40 ${selected
                          ? 'border-warm-clay/50 bg-warm-clay/15 text-ink'
                          : 'border-ink/10 bg-white/40 text-ink/60 hover:border-warm-clay/35 hover:text-ink'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={customTag}
                    onChange={(event) => setCustomTag(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addTag(customTag);
                      }
                    }}
                    className="ny-input min-w-0 flex-1 px-3 py-2 text-sm"
                    placeholder="Add custom tag"
                    disabled={tags.length >= 5}
                  />
                  <button
                    type="button"
                    onClick={() => addTag(customTag)}
                    disabled={tags.length >= 5 || !customTag.trim()}
                    className="ny-button-secondary min-h-0 px-3 py-2 text-xs disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <p className="ny-label text-warm-clay">What are you saving?</p>
                <div className="mt-4 grid gap-3 grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                  {secretCards.map((card) => (
                    <SecretTypeCard
                      key={card.type}
                      {...card}
                      selected={secretType === card.type}
                      onSelect={() => setSecretType(card.type)}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-ink/[0.08] bg-white/40 p-3 sm:p-4 min-w-0 overflow-hidden">
                {secretType === 'seed' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-display text-lg sm:text-xl text-ink">Enter seed phrase</h3>
                        <p className="mt-1 text-xs sm:text-sm text-ink/65">Type each word in order. Nythera will join them before encryption.</p>
                      </div>
                      <div className="inline-flex rounded-lg border border-ink/10 bg-ink/[0.05] p-1">
                        {[12, 24].map((count) => (
                          <button
                            key={count}
                            type="button"
                            onClick={() => setSeedWordCount(count as 12 | 24)}
                            className={`rounded-md px-3 py-1 text-xs font-medium transition ${seedWordCount === count
                              ? 'bg-warm-clay/20 text-ink'
                              : 'text-ink/50 hover:text-ink'
                            }`}
                          >
                            {count} words
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 lg:grid-cols-3">
                      {Array.from({ length: seedWordCount }).map((_, index) => (
                        <label key={index} className="flex items-center gap-2 rounded-lg border border-ink/10 bg-white/50 px-2.5 py-2 min-w-0">
                          <span className="w-5 shrink-0 text-right font-mono text-xs text-warm-clay font-medium">{index + 1}</span>
                          <input
                            value={seedWords[index]}
                            onChange={(event) => setSeedWord(index, event.target.value)}
                            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink/30"
                            placeholder="word"
                            autoComplete="off"
                            spellCheck={false}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {secretType === 'private-key' && (
                  <div className="space-y-3">
                    <h3 className="font-display text-xl text-ink">Enter private key</h3>
                    <div className="flex gap-2">
                      <input
                        value={privateKey}
                        onChange={(event) => setPrivateKey(event.target.value)}
                        type={showPrivateKey ? 'text' : 'password'}
                        className="ny-input min-w-0 flex-1 px-3 py-2 font-mono text-sm"
                        placeholder="0x..."
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPrivateKey((value) => !value)}
                        className="ny-button-secondary min-h-0 px-3"
                        aria-label={showPrivateKey ? 'Hide private key' : 'Show private key'}
                      >
                        <EyeIcon size={16} />
                      </button>
                    </div>
                    <p className={`text-xs ${privateKey && !isPrivateKey(privateKey) ? 'text-warm-clay font-medium' : 'text-ink/50'}`}>
                      Private keys should be 64 hex characters and start with 0x.
                    </p>
                  </div>
                )}

                {secretType === 'password' && (
                  <div className="space-y-4">
                    <h3 className="font-display text-xl text-ink">Save a password or PIN</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        type={showPassword ? 'text' : 'password'}
                        className="ny-input px-3 py-2"
                        placeholder="Password or PIN"
                        autoComplete="off"
                      />
                      <input
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        type={showPassword ? 'text' : 'password'}
                        className="ny-input px-3 py-2"
                        placeholder="Confirm password or PIN"
                        autoComplete="off"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/[0.08]">
                          <div className={`h-full ${strength.tone}`} style={{ width: `${Math.min(strength.score, 5) * 20}%` }} />
                        </div>
                        <span className="text-xs text-ink/60">{strength.label}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="text-xs font-medium text-warm-clay hover:text-ink transition"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {password && confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-warm-clay font-medium">The two fields do not match yet.</p>
                    )}
                  </div>
                )}

                {secretType === 'note' && (
                  <div className="space-y-3">
                    <h3 className="font-display text-xl text-ink">Write a custom note</h3>
                    <textarea
                      rows={7}
                      value={customNote}
                      onChange={(event) => setCustomNote(event.target.value)}
                      className="ny-input w-full px-3 py-3 text-sm leading-6"
                      placeholder="Emergency instructions, exchange login hints, or anything your trusted person may need."
                    />
                  </div>
                )}

                {secretType === 'file' && (
                  <div className="space-y-4">
                    <h3 className="font-display text-xl text-ink">Upload an encrypted file backup</h3>
                    <label
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDraggingFile(true);
                      }}
                      onDragLeave={() => setDraggingFile(false)}
                      onDrop={(event) => {
                        event.preventDefault();
                        setDraggingFile(false);
                        setSelectedFile(event.dataTransfer.files?.[0] ?? null);
                      }}
                      className={`block cursor-pointer rounded-2xl border border-dashed p-6 text-center transition ${draggingFile
                        ? 'border-warm-clay/60 bg-warm-clay/10'
                        : 'border-ink/20 bg-white/40 hover:border-warm-clay/35'
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/*,.txt,.pdf"
                        onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                        className="sr-only"
                      />
                      <p className="font-medium text-ink">{file ? file.name : 'Drop a file here or click to choose'}</p>
                      <p className="mt-2 text-xs text-ink/50">
                        Images, PDFs, and text files under {MAX_WALRUS_FILE_LABEL}. {file ? `Selected size: ${fileSizeLabel(file)}.` : ''}
                      </p>
                    </label>
                    <div className={`rounded-xl border p-3 text-sm ${hasEnoughStorageCredits
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-800'
                      : 'border-warm-clay/20 bg-warm-clay/10 text-ink'
                    }`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>Storage credits needed</span>
                        <span className="font-mono">{storageCreditsRequired}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-ink/60">
                        <span>Your balance</span>
                        <span className="font-mono">
                          {storageCredits.loading
                            ? 'Checking...'
                            : storageCredits.balance === null
                              ? storageCredits.skipped ? 'Untracked in this environment' : 'Unavailable'
                              : storageCredits.balance}
                        </span>
                      </div>
                      {!hasEnoughStorageCredits && (
                        <p className="mt-2 text-xs text-warm-clay font-medium">
                          Ask the admin to add storage credits before creating a file backup.
                        </p>
                      )}
                      {storageCredits.error && (
                        <p className="mt-2 text-xs text-warm-clay font-medium">{storageCredits.error}</p>
                      )}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-ink/75">Optional file note</label>
                      <textarea
                        rows={2}
                        value={fileNote}
                        onChange={(event) => setFileNote(event.target.value)}
                        className="ny-input w-full px-3 py-2 text-sm"
                        placeholder="Add a hint for this file."
                      />
                    </div>
                  </div>
                )}
              </div>

              {!step0Valid && (
                <p className="text-sm text-warm-clay font-semibold">
                  {!normalizedVaultName
                    ? 'Add a vault name to continue.'
                    : !secretValidation.valid
                      ? secretValidation.message
                      : `Add ${storageCreditsRequired} storage credits before creating a file backup.`}
                </p>
              )}
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <p className="ny-label text-warm-clay font-medium">Trusted contacts</p>
              <h2 className="font-display text-xl text-ink">Who should be able to recover this?</h2>
              <p className="text-sm leading-6 text-ink/65">
                Add wallet addresses or email contacts. Your wallet is always included, and you can update trusted contacts later.
              </p>
              <textarea
                rows={5}
                value={recipients}
                onChange={(event) => setRecipients(event.target.value)}
                className="ny-input w-full px-3 py-3 text-sm"
                placeholder="0xabc..., friend@example.com"
              />
              <p className="text-xs text-ink/40">
                Separate contacts with commas or new lines. Email contacts are prepared as wallet-based recovery contacts where supported.
              </p>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <p className="ny-label text-warm-clay font-medium">Safety</p>
              <h2 className="font-display text-xl text-ink">How this vault will be protected</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="ny-tile p-4">
                  <p className="ny-label">Recovery access</p>
                  <p className="mt-2 text-sm text-ink/75">Only you and trusted contacts can open this vault.</p>
                </div>
                <div className="ny-tile p-4">
                  <p className="ny-label">Trusted contacts</p>
                  <p className="mt-2 text-sm text-ink/75">
                    {additionalGuardians ? `${additionalGuardians} added` : 'No extra contacts yet'}
                  </p>
                </div>
                <div className="ny-tile p-4">
                  <p className="ny-label">Encryption</p>
                  <p className="mt-2 text-sm text-ink/75">Encrypted in your browser before saving.</p>
                </div>
                <div className="ny-tile p-4">
                  <p className="ny-label">Storage</p>
                  <p className="mt-2 text-sm text-ink/75">
                    {secretType === 'file' ? 'Encrypted file plus vault key' : 'Encrypted vault backup'}
                  </p>
                </div>
              </div>

              {secretType === 'file' && file && (
                <div className="ny-tile p-4">
                  <label className="mb-2 block text-xs font-medium text-ink/75">File storage reminders</label>
                  <select
                    value={renewalMode}
                    onChange={(event) => setRenewalMode(event.target.value as RenewalMode)}
                    className="select-chevron ny-input w-full px-3 py-2"
                  >
                    <option value="notify">Notify me before expiry</option>
                    <option value="autoRenew">Auto-renew using storage credits</option>
                  </select>
                  <p className="mt-2 text-xs text-ink/50">
                    Nythera will remind you before file storage needs attention. File backup creation uses {storageCreditsRequired} storage credits.
                  </p>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <p className="ny-label text-warm-clay font-medium">Finish</p>
              <h2 className="font-display text-xl text-ink">Review before saving</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <ReviewTile label="Vault name" value={normalizedVaultName || 'Untitled vault'} />
                <ReviewTile label="Description" value={normalizedDescription || 'No description added'} />
                <ReviewTile label="Secret type" value={secretCards.find((card) => card.type === secretType)?.title ?? 'Secret'} />
                <ReviewTile label="Trusted contacts" value={additionalGuardians ? `${additionalGuardians} added` : 'Only your wallet'} />
                <ReviewTile label="Tags" value={tags.length ? tags.join(', ') : 'No tags'} />
                {secretType === 'file' && (
                  <ReviewTile
                    label="Storage credits"
                    value={`${storageCreditsRequired} required / ${storageCredits.balance ?? 'untracked'} available`}
                  />
                )}
                <ReviewTile label="Saving flow" value="3 wallet confirmations" />
              </div>
              <div className="rounded-xl border border-warm-clay/20 bg-warm-clay/15 p-4 text-sm leading-6 text-ink">
                Your secret is encrypted locally, then saved to blockchain storage. Nythera will ask your wallet to confirm each save step.
              </div>
            </div>
          )}
        </StepWizard>

        {loading && progressStage !== 'idle' && (
          <div className={`rounded-xl border p-4 text-sm text-zinc-800 ${progressStage === 'complete'
            ? 'ny-success-surface'
            : 'border-warm-clay/20 bg-warm-clay/15'
          }`}>
            {progressStage === 'complete' ? (
              <SuccessMotion
                label="Vault created"
                detail={createProgressCopy[progressStage]}
              />
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-warm-clay">Creating vault</p>
                <p className="mt-2 text-ink/85">{createProgressCopy[progressStage]}</p>
              </>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-300/35 bg-red-300/10 p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700">Could not create vault</p>
            <p className="mt-2 text-red-700/80">{formattedError.summary}</p>
            {formattedError.details && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-ink/50">Advanced details</summary>
                <p className="mt-2 break-words font-mono text-xs text-ink/40">{formattedError.details}</p>
              </details>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
            disabled={currentStep === 0}
            className="ny-button-secondary disabled:opacity-40"
          >
            Back
          </button>
          <div className="text-[11px] text-ink/50">
            Step {currentStep + 1} of {steps.length}
          </div>
          {currentStep < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))}
              disabled={currentStep === 0 && !step0Valid}
              className="ny-button disabled:opacity-50"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="ny-button disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Vault'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function SecretTypeCard({
  title,
  description,
  selected,
  onSelect,
}: {
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-h-40 rounded-2xl border p-4 text-left transition ${selected
        ? 'border-warm-clay/50 bg-warm-clay/10 shadow-[0_0_30px_rgba(196,149,106,0.08)]'
        : 'border-ink/10 bg-white/40 hover:border-ink/20 hover:bg-white/60'
      }`}
    >
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-2 text-xs leading-5 text-ink/60">{description}</p>
    </button>
  );
}

function ReviewTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="ny-tile p-4">
      <p className="ny-label">{label}</p>
      <p className="mt-2 text-sm text-ink/75 break-all">{value}</p>
    </div>
  );
}

async function prepareWalrusFilePayload(
  file: File,
  creatorWallet: string,
  renewalMode: RenewalMode,
  note: string,
  epochs: number,
  fetchFn: typeof fetch = fetch,
): Promise<WalrusFilePayload> {
  const encrypted = await encryptFileForWalrus(file);
  const body = new FormData();
  body.append(
    'file',
    new Blob([exactArrayBuffer(encrypted.ciphertext)], { type: 'application/octet-stream' }),
    encrypted.fileName,
  );
  body.append('creatorWallet', creatorWallet);
  body.append('fileName', encrypted.fileName);
  body.append('fileSize', String(encrypted.fileSize));
  body.append('mimeType', encrypted.mimeType);
  body.append('renewalMode', renewalMode);
  body.append('epochs', String(epochs));

  const response = await fetchFn('/api/storage/walrus/upload', {
    method: 'POST',
    body,
  });
  const result = (await response.json().catch(() => ({}))) as WalrusUploadResponse;
  if (!response.ok) {
    if (response.status === 413) {
      throw new Error(`File is too large for the current upload limit. Choose a file under ${MAX_WALRUS_FILE_LABEL}.`);
    }
    throw new Error(result.error ?? `File upload failed (${response.status})`);
  }

  return {
    type: 'walrus-file',
    blobId: result.blobId,
    objectId: result.objectId,
    fileName: encrypted.fileName,
    fileSize: encrypted.fileSize,
    mimeType: encrypted.mimeType,
    encryptionKey: encrypted.encryptionKey,
    iv: encrypted.iv,
    endEpoch: result.endEpoch,
    endDate: result.endDate,
    renewalMode,
    note: note.trim() ? note.trim() : undefined,
  };
}

async function persistVaultRecord({
  vault,
  address,
  vaultName,
  vaultDescription,
  vaultTags,
  contentType,
  filePayload,
  walletRecipients,
  emailRecipients,
  resolvedEmailWallets,
  fetchFn,
}: {
  vault: Awaited<ReturnType<typeof createVaultWithCDR>>['vault'];
  address: string;
  vaultName: string;
  vaultDescription: string;
  vaultTags: string[];
  contentType: 'text' | 'walrus-file';
  filePayload: WalrusFilePayload | null;
  walletRecipients: `0x${string}`[];
  emailRecipients: string[];
  resolvedEmailWallets: `0x${string}`[];
  fetchFn?: typeof fetch;
}) {
  const effectiveFetch = fetchFn ?? fetch;
  if (!vault.cdr) return;

  const recipients = [
    ...walletRecipients.map((wallet) => ({ kind: 'wallet' as const, value: wallet, resolvedWallet: wallet })),
    ...emailRecipients.flatMap((email, index) => {
      const resolvedWallet = resolvedEmailWallets[index];
      return resolvedWallet ? [{ kind: 'email' as const, value: email, resolvedWallet }] : [];
    }),
  ];

  const response = await effectiveFetch('/api/vault-records', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      localVaultId: vault.id,
      vaultName,
      vaultDescription,
      vaultTags,
      cdrUuid: vault.cdr.uuid,
      creatorWallet: address,
      contentType,
      renewalMode: filePayload?.renewalMode ?? 'notify',
      walrusBlobId: filePayload?.blobId,
      walrusObjectId: filePayload?.objectId,
      walrusEndEpoch: filePayload?.endEpoch,
      walrusEndDate: filePayload?.endDate,
      fileName: filePayload?.fileName,
      fileSize: filePayload?.fileSize,
      mimeType: filePayload?.mimeType,
      cdrAllocateTx: vault.cdr.allocateTxHash,
      cdrWriteTx: vault.cdr.writeTxHash,
      accessConditionVersion: vault.cdr.conditionVersion,
      accessConditionAddress: vault.cdr.accessConditionAddress,
      readConditionData: vault.cdr.readConditionData,
      writeConditionData: vault.cdr.writeConditionData,
      accessAuxData: vault.cdr.accessAuxData,
      recipients,
    }),
  });

  const result = (await response.json().catch(() => ({}))) as { error?: string; skipped?: boolean };
  if (!response.ok && !result.skipped) {
    throw new Error(result.error ?? `Vault details save failed (${response.status})`);
  }
}
