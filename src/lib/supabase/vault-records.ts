import type { SupabaseClient } from '@supabase/supabase-js';
import { createPublicClient, http } from 'viem';
import type { VaultData } from '@/lib/crypto/vault';
import { CDR_DEFAULTS } from '@/lib/crypto/cdr-config';
import { checkWalrusBlobAvailable } from '@/lib/walrus/client';

export type RenewalMode = 'notify' | 'autoRenew';
export type VaultContentType = 'text' | 'walrus-file';

export interface WalrusVaultMetadata {
  localVaultId?: string;
  vaultName?: string;
  vaultDescription?: string;
  vaultTags?: string[];
  cdrUuid: number;
  creatorWallet: string;
  contentType: VaultContentType;
  renewalMode?: RenewalMode;
  walrusBlobId?: string;
  walrusObjectId?: string;
  walrusStartEpoch?: number;
  walrusEndEpoch?: number;
  walrusEndDate?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  cdrAllocateTx?: string;
  cdrWriteTx?: string;
  accessConditionVersion?: string;
  accessConditionAddress?: string;
  readConditionData?: string;
  writeConditionData?: string;
  accessAuxData?: string;
  recipients?: { kind: 'wallet' | 'email'; value: string; resolvedWallet: string }[];
}

type VaultRecipientRow = {
  vault_record_id: string;
  kind: 'wallet' | 'email';
  value: string;
  resolved_wallet: string;
};

type VaultRecoveryRow = {
  id: string;
  vault_record_id: string;
  recovered_by_wallet: string;
  recovered_at: string;
};

type VaultRecordRow = {
  id: string;
  local_vault_id: string | null;
  vault_name: string | null;
  vault_description: string | null;
  vault_tags: string[] | null;
  cdr_uuid: number;
  creator_wallet: string;
  content_type: VaultContentType;
  status: 'active' | 'locked' | 'recovering';
  renewal_mode: RenewalMode | null;
  walrus_blob_id: string | null;
  walrus_object_id: string | null;
  walrus_start_epoch: number | null;
  walrus_end_epoch: number | null;
  walrus_end_date: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  cdr_allocate_tx: string | null;
  cdr_write_tx: string | null;
  access_condition_version: string | null;
  access_condition_address: string | null;
  read_condition_data: string | null;
  write_condition_data: string | null;
  access_aux_data: string | null;
  created_at: string;
  vault_recipients?: VaultRecipientRow[];
  vault_recoveries?: VaultRecoveryRow[];
};

type VaultRecoverability = {
  recoverable: boolean;
  reason?: string;
};

function asHex(value?: string | null): `0x${string}` | undefined {
  return value?.startsWith('0x') ? (value as `0x${string}`) : undefined;
}

function asWallet(value?: string | null): `0x${string}` | undefined {
  if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) return undefined;
  return value as `0x${string}`;
}

function asTxHash(value?: string | null): `0x${string}` | undefined {
  if (!value || !/^0x[a-fA-F0-9]{64}$/.test(value)) return undefined;
  return value as `0x${string}`;
}

export function vaultRecordToVault(row: VaultRecordRow, recoverability?: VaultRecoverability): VaultData {
  const recipients = row.vault_recipients ?? [];
  const walletRecipients = recipients
    .filter((recipient) => recipient.kind === 'wallet')
    .map((recipient) => asWallet(recipient.resolved_wallet))
    .filter((wallet): wallet is `0x${string}` => Boolean(wallet));
  const emailRecipients = recipients
    .filter((recipient) => recipient.kind === 'email')
    .map((recipient) => recipient.value);
  const resolvedEmailWallets = recipients
    .filter((recipient) => recipient.kind === 'email')
    .map((recipient) => asWallet(recipient.resolved_wallet))
    .filter((wallet): wallet is `0x${string}` => Boolean(wallet));

  const conditionVersion = row.access_condition_version === 'v3-origin-access'
    ? 'v3-origin-access'
    : row.access_condition_version === 'v2-encoded-access'
      ? 'v2-encoded-access'
      : 'v1-storage-whitelist';
  const createdAt = Date.parse(row.created_at);

  return {
    id: row.local_vault_id ?? `cdr-${row.cdr_uuid}`,
    name: row.vault_name ?? undefined,
    description: row.vault_description ?? undefined,
    tags: row.vault_tags ?? [],
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    ownerAddress: row.creator_wallet,
    encryptedBlob: '',
    totalShares: 0,
    threshold: 0,
    shards: [],
    guardians: [],
    timelockDelay: '14d',
    ipfsCid: '',
    storyProtocolId: `sp-cdr-${row.cdr_uuid}`,
    status: row.status ?? 'active',
    cdr: {
      uuid: row.cdr_uuid,
      allocateTxHash: asHex(row.cdr_allocate_tx) ?? '0x',
      writeTxHash: asHex(row.cdr_write_tx) ?? '0x',
      conditionVersion,
      accessConditionAddress: asHex(row.access_condition_address),
      readConditionData: asHex(row.read_condition_data),
      writeConditionData: asHex(row.write_condition_data),
      accessAuxData: asHex(row.access_aux_data) ?? '0x',
    },
    recipients: {
      wallets: walletRecipients,
      emails: emailRecipients,
      resolvedEmailWallets,
    },
    contentType: row.content_type,
    walrus: row.content_type === 'walrus-file' && row.walrus_blob_id
      ? {
        blobId: row.walrus_blob_id,
        objectId: row.walrus_object_id ?? undefined,
        fileName: row.file_name ?? 'encrypted-file',
        fileSize: row.file_size ?? 0,
        mimeType: row.mime_type ?? 'application/octet-stream',
        endEpoch: row.walrus_end_epoch ?? undefined,
        endDate: row.walrus_end_date ?? undefined,
        renewalMode: row.renewal_mode ?? 'notify',
      }
      : undefined,
    recoveryEvents: (row.vault_recoveries ?? []).map((event) => ({
      recoveredAt: Number.isFinite(Date.parse(event.recovered_at)) ? Date.parse(event.recovered_at) : Date.now(),
      recoveredBy: event.recovered_by_wallet,
      cdrUuid: row.cdr_uuid,
      contentType: row.content_type,
    })),
    recoverability,
  };
}

export async function ensureStorageAccount(
  supabase: SupabaseClient,
  walletAddress: string,
  email?: string,
) {
  const { data: existing, error: readError } = await supabase
    .from('user_storage_accounts')
    .select('*')
    .eq('wallet_address', walletAddress.toLowerCase())
    .maybeSingle();

  if (readError) throw readError;
  if (existing) return existing;

  const { data, error } = await supabase
    .from('user_storage_accounts')
    .insert({
      wallet_address: walletAddress.toLowerCase(),
      email,
      credits_balance: 2,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function spendCredits(
  supabase: SupabaseClient,
  walletAddress: string,
  credits: number,
  reason: string,
) {
  const account = await ensureStorageAccount(supabase, walletAddress);
  if ((account.credits_balance as number) < credits) {
    throw new Error('Insufficient storage credits.');
  }

  const nextBalance = (account.credits_balance as number) - credits;
  const { error: updateError } = await supabase
    .from('user_storage_accounts')
    .update({ credits_balance: nextBalance, updated_at: new Date().toISOString() })
    .eq('wallet_address', walletAddress.toLowerCase());
  if (updateError) throw updateError;

  const { error: ledgerError } = await supabase.from('credit_ledger').insert({
    wallet_address: walletAddress.toLowerCase(),
    delta: -credits,
    reason,
  });
  if (ledgerError) throw ledgerError;

  return nextBalance;
}

export async function grantCredits(
  supabase: SupabaseClient,
  walletAddress: string,
  credits: number,
  adminNote?: string,
) {
  const account = await ensureStorageAccount(supabase, walletAddress);
  const nextBalance = (account.credits_balance as number) + credits;

  const { error: updateError } = await supabase
    .from('user_storage_accounts')
    .update({ credits_balance: nextBalance, updated_at: new Date().toISOString() })
    .eq('wallet_address', walletAddress.toLowerCase());
  if (updateError) throw updateError;

  const { error: ledgerError } = await supabase.from('credit_ledger').insert({
    wallet_address: walletAddress.toLowerCase(),
    delta: credits,
    reason: 'admin_grant',
    admin_note: adminNote,
  });
  if (ledgerError) throw ledgerError;

  return nextBalance;
}

export async function createVaultRecord(
  supabase: SupabaseClient,
  metadata: WalrusVaultMetadata,
) {
  await ensureStorageAccount(supabase, metadata.creatorWallet);

  const recordPayload = {
    local_vault_id: metadata.localVaultId,
    vault_name: metadata.vaultName?.trim() || null,
    vault_description: metadata.vaultDescription?.trim() || null,
    vault_tags: metadata.vaultTags ?? [],
    cdr_uuid: metadata.cdrUuid,
    creator_wallet: metadata.creatorWallet.toLowerCase(),
    content_type: metadata.contentType,
    renewal_mode: metadata.renewalMode ?? 'notify',
    walrus_blob_id: metadata.walrusBlobId,
    walrus_object_id: metadata.walrusObjectId,
    walrus_start_epoch: metadata.walrusStartEpoch,
    walrus_end_epoch: metadata.walrusEndEpoch,
    walrus_end_date: metadata.walrusEndDate,
    file_name: metadata.fileName,
    file_size: metadata.fileSize,
    mime_type: metadata.mimeType,
    cdr_allocate_tx: metadata.cdrAllocateTx,
    cdr_write_tx: metadata.cdrWriteTx,
    access_condition_version: metadata.accessConditionVersion,
    access_condition_address: metadata.accessConditionAddress,
    read_condition_data: metadata.readConditionData,
    write_condition_data: metadata.writeConditionData,
    access_aux_data: metadata.accessAuxData,
  };

  let { data, error } = await supabase
    .from('vault_records')
    .insert(recordPayload)
    .select('*')
    .single();

  if (error && /vault_name|vault_description|vault_tags/i.test(error.message)) {
    const fallbackPayload = { ...recordPayload };
    delete (fallbackPayload as Partial<typeof recordPayload>).vault_description;
    delete (fallbackPayload as Partial<typeof recordPayload>).vault_tags;
    if (/vault_name/i.test(error.message)) {
      delete (fallbackPayload as Partial<typeof recordPayload>).vault_name;
    }
    const fallback = await supabase
      .from('vault_records')
      .insert(fallbackPayload)
      .select('*')
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;

  if (metadata.recipients?.length) {
    const { error: recipientError } = await supabase.from('vault_recipients').insert(
      metadata.recipients.map((recipient) => ({
        vault_record_id: data.id,
        kind: recipient.kind,
        value: recipient.value,
        resolved_wallet: recipient.resolvedWallet.toLowerCase(),
      })),
    );
    if (recipientError) throw recipientError;

    const emailRecipients = metadata.recipients.filter((recipient) => recipient.kind === 'email');
    if (emailRecipients.length > 0) {
      const { error: notificationError } = await supabase.from('notification_events').insert(
        emailRecipients.map((recipient) => ({
          vault_record_id: data.id,
          recipient_email: recipient.value,
          type: 'vault_invite',
        })),
      );
      if (notificationError) throw notificationError;
    }
  }

  return data;
}

export async function listVaultsForWallet(
  supabase: SupabaseClient,
  walletAddress: string,
): Promise<VaultData[]> {
  const wallet = walletAddress.toLowerCase();
  const selectVaultWithRecipients = '*, vault_recipients(*), vault_recoveries(*)';
  const vaultsById = new Map<string, VaultRecordRow>();

  const { data: ownedVaults, error: ownedError } = await supabase
    .from('vault_records')
    .select(selectVaultWithRecipients)
    .eq('creator_wallet', wallet)
    .order('created_at', { ascending: false });
  if (ownedError) throw ownedError;

  for (const vault of (ownedVaults ?? []) as VaultRecordRow[]) {
    vaultsById.set(vault.id, vault);
  }

  const { data: recipientRows, error: recipientError } = await supabase
    .from('vault_recipients')
    .select('vault_record_id')
    .eq('resolved_wallet', wallet);
  if (recipientError) throw recipientError;

  const sharedVaultIds = [
    ...new Set(
      (recipientRows ?? [])
        .map((recipient) => (recipient as { vault_record_id?: string }).vault_record_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ].filter((id) => !vaultsById.has(id));

  if (sharedVaultIds.length > 0) {
    const { data: sharedVaults, error: sharedError } = await supabase
      .from('vault_records')
      .select(selectVaultWithRecipients)
      .in('id', sharedVaultIds)
      .order('created_at', { ascending: false });
    if (sharedError) throw sharedError;

    for (const vault of (sharedVaults ?? []) as VaultRecordRow[]) {
      vaultsById.set(vault.id, vault);
    }
  }

  const recoverabilityById = await getVaultRecoverability([...vaultsById.values()]);
  return [...vaultsById.values()]
    .map((row) => vaultRecordToVault(row, recoverabilityById.get(row.id)))
    .sort((a, b) => b.createdAt - a.createdAt);
}

async function getVaultRecoverability(rows: VaultRecordRow[]): Promise<Map<string, VaultRecoverability>> {
  const client = createPublicClient({
    transport: http(CDR_DEFAULTS.rpcUrl),
  });

  const checkedRows = await Promise.all(rows.map(async (row): Promise<[string, VaultRecoverability]> => {
    const writeHash = asTxHash(row.cdr_write_tx);
    if (!writeHash) {
      return [row.id, {
        recoverable: false,
        reason: 'The encrypted vault was not saved.',
      }];
    }

    try {
      const receipt = await client.getTransactionReceipt({ hash: writeHash });
      if (receipt.status !== 'success') {
        return [row.id, {
          recoverable: false,
          reason: "Couldn't save to blockchain - try again.",
        }];
      }
    } catch {
      // If the RPC cannot answer, keep the record unless later storage checks prove it is unusable.
    }

    if (row.content_type !== 'walrus-file') {
      return [row.id, { recoverable: true }];
    }
    if (!row.walrus_blob_id) {
      return [row.id, {
        recoverable: false,
        reason: 'The encrypted file reference is missing.',
      }];
    }

    const walrusAvailable = await checkWalrusBlobAvailable(row.walrus_blob_id, row.walrus_object_id ?? undefined);
    return [row.id, walrusAvailable
      ? { recoverable: true }
      : {
        recoverable: false,
        reason: 'The encrypted file is unavailable.',
      }];
  }));

  return new Map(checkedRows);
}

export async function getCreditBalance(supabase: SupabaseClient, walletAddress: string): Promise<number> {
  const account = await ensureStorageAccount(supabase, walletAddress);
  return account.credits_balance as number;
}

export async function markVaultRenewalStatus(
  supabase: SupabaseClient,
  vaultRecordId: string,
  renewalStatus: string,
  patch: Record<string, unknown> = {},
) {
  const { data, error } = await supabase
    .from('vault_records')
    .update({
      renewal_status: renewalStatus,
      updated_at: new Date().toISOString(),
      ...patch,
    })
    .eq('id', vaultRecordId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function enqueueNotification(
  supabase: SupabaseClient,
  params: {
    vaultRecordId: string;
    recipientEmail: string;
    type: string;
    scheduledFor?: string;
    status?: string;
    error?: string;
  },
) {
  const { data, error } = await supabase
    .from('notification_events')
    .upsert({
      vault_record_id: params.vaultRecordId,
      recipient_email: params.recipientEmail.toLowerCase(),
      type: params.type,
      scheduled_for: params.scheduledFor ?? new Date().toISOString(),
      status: params.status ?? 'pending',
      error: params.error,
    }, {
      onConflict: 'vault_record_id,recipient_email,type',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
