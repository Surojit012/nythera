import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin } from '@/lib/supabase/admin';
import {
  enqueueNotification,
  getCreditBalance,
  markVaultRenewalStatus,
  spendCredits,
} from '@/lib/supabase/vault-records';
import { getDefaultWalrusEpochs, renewWalrusBlob } from '@/lib/walrus/client';

export const runtime = 'nodejs';

const REMINDER_DAYS = [14, 7, 2] as const;

type SupabaseAdmin = ReturnType<typeof requireSupabaseAdmin>;
type VaultRecipientRow = {
  kind: string;
  value: string;
};
type RenewalVaultRow = {
  id: string;
  creator_wallet: string;
  renewal_mode: 'notify' | 'autoRenew';
  walrus_object_id?: string | null;
  walrus_end_epoch?: number | null;
  walrus_end_date?: string | null;
  vault_recipients?: VaultRecipientRow[];
};

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const supplied = request.headers.get('x-cron-secret') ?? request.headers.get('authorization')?.replace('Bearer ', '');
    if (supplied !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
  }

  const supabase = requireSupabaseAdmin();
  const horizon = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: vaults, error } = await supabase
    .from('vault_records')
    .select('*, vault_recipients(*)')
    .eq('content_type', 'walrus-file')
    .lte('walrus_end_date', horizon)
    .neq('status', 'expired');
  if (error) throw error;

  const results: unknown[] = [];
  for (const vault of (vaults ?? []) as RenewalVaultRow[]) {
    if (vault.renewal_mode === 'autoRenew') {
      results.push(await handleAutoRenew(supabase, vault));
    } else {
      results.push(await enqueueDueReminders(supabase, vault, 'renewal_reminder'));
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}

async function handleAutoRenew(supabase: SupabaseAdmin, vault: RenewalVaultRow) {
  const epochs = getDefaultWalrusEpochs();
  const balance = await getCreditBalance(supabase, vault.creator_wallet as string);
  if (balance < epochs) {
    await markVaultRenewalStatus(supabase, vault.id as string, 'needs_credits');
    await enqueueDueReminders(supabase, vault, 'auto_renew_failed_needs_credits');
    return { vaultRecordId: vault.id, status: 'needs_credits' };
  }

  try {
    const renewal = await renewWalrusBlob(vault.walrus_object_id as string, { epochs });
    await spendCredits(supabase, vault.creator_wallet as string, epochs, 'walrus_auto_renewal');
    await markVaultRenewalStatus(supabase, vault.id as string, 'active', {
      walrus_end_epoch: renewal.endEpoch ?? ((vault.walrus_end_epoch as number | null) ?? 0) + epochs,
      walrus_end_date: estimateExtendedDate(vault.walrus_end_date as string | null, epochs),
    });
    await enqueueDueReminders(supabase, vault, 'auto_renew_success');
    return { vaultRecordId: vault.id, status: 'renewed' };
  } catch (error) {
    await markVaultRenewalStatus(supabase, vault.id as string, 'renewal_failed');
    await enqueueDueReminders(
      supabase,
      vault,
      'auto_renew_failed',
      error instanceof Error ? error.message : 'Walrus renewal failed.',
    );
    return { vaultRecordId: vault.id, status: 'renewal_failed' };
  }
}

async function enqueueDueReminders(
  supabase: SupabaseAdmin,
  vault: RenewalVaultRow,
  type: string,
  error?: string,
) {
  const recipients = (vault.vault_recipients ?? [])
    .filter((recipient) => recipient.kind === 'email')
    .map((recipient) => recipient.value);

  const creatorAccount = await supabase
    .from('user_storage_accounts')
    .select('email')
    .eq('wallet_address', (vault.creator_wallet as string).toLowerCase())
    .maybeSingle();
  if (creatorAccount.data?.email) recipients.push(creatorAccount.data.email as string);

  const uniqueEmails = [...new Set(recipients.filter(Boolean))];
  const daysUntilExpiry = daysBetween(new Date(), new Date(vault.walrus_end_date as string));
  const threshold = REMINDER_DAYS.find((days) => daysUntilExpiry <= days);
  if (!threshold && type === 'renewal_reminder') {
    return { vaultRecordId: vault.id, status: 'not_due' };
  }

  for (const email of uniqueEmails) {
    await enqueueNotification(supabase, {
      vaultRecordId: vault.id as string,
      recipientEmail: email,
      type: `${type}${threshold ? `_${threshold}d` : ''}`,
      error,
    });
  }

  return { vaultRecordId: vault.id, status: 'queued_notifications', count: uniqueEmails.length };
}

function daysBetween(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function estimateExtendedDate(current: string | null, epochs: number): string {
  const base = current ? new Date(current).getTime() : Date.now();
  return new Date(base + epochs * 14 * 24 * 60 * 60 * 1000).toISOString();
}
