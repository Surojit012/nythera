import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin } from '@/lib/supabase/admin';
import {
  getCreditBalance,
  markVaultRenewalStatus,
  spendCredits,
} from '@/lib/supabase/vault-records';
import { getDefaultWalrusEpochs, renewWalrusBlob } from '@/lib/walrus/client';
import { withAuth, type AuthContext } from '@/lib/auth/server-auth';

export const runtime = 'nodejs';

export const POST = withAuth(async (request: NextRequest, auth: AuthContext) => {
  try {
    const body = (await request.json()) as { vaultRecordId?: string; epochs?: number };
    if (!body.vaultRecordId) {
      return NextResponse.json({ error: 'vaultRecordId is required.' }, { status: 400 });
    }

    const supabase = requireSupabaseAdmin();
    const { data: vault, error } = await supabase
      .from('vault_records')
      .select('*')
      .eq('id', body.vaultRecordId)
      .single();
    if (error) throw error;
    if (!vault?.walrus_object_id) {
      return NextResponse.json({ error: 'Vault does not have a Walrus objectId to renew.' }, { status: 400 });
    }

    // Verify the authenticated user owns this vault record
    if ((vault.creator_wallet as string).toLowerCase() !== auth.walletAddress) {
      return NextResponse.json({ error: 'You are not the owner of this vault.' }, { status: 403 });
    }

    const epochs = normalizeEpochs(body.epochs);
    const balance = await getCreditBalance(supabase, vault.creator_wallet as string);
    if (balance < epochs) {
      await markVaultRenewalStatus(supabase, body.vaultRecordId, 'needs_credits');
      return NextResponse.json({ error: 'Insufficient credits.', balance, required: epochs }, { status: 402 });
    }

    const renewal = await renewWalrusBlob(vault.walrus_object_id as string, { epochs });
    await spendCredits(supabase, vault.creator_wallet as string, epochs, 'walrus_renewal');
    const endEpoch = renewal.endEpoch ?? ((vault.walrus_end_epoch as number | null) ?? 0) + epochs;

    const updated = await markVaultRenewalStatus(supabase, body.vaultRecordId, 'active', {
      walrus_end_epoch: endEpoch,
      walrus_end_date: estimateExtendedDate(vault.walrus_end_date as string | null, epochs),
    });

    return NextResponse.json({ ok: true, renewal, record: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Walrus renewal failed.';
    const status = message.includes('not configured') ? 501 : 500;
    return NextResponse.json({ error: message }, { status });
  }
});

function normalizeEpochs(value: number | undefined): number {
  const parsed = Number(value ?? getDefaultWalrusEpochs());
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : getDefaultWalrusEpochs();
}

function estimateExtendedDate(current: string | null, epochs: number): string {
  const base = current ? new Date(current).getTime() : Date.now();
  return new Date(base + epochs * 14 * 24 * 60 * 60 * 1000).toISOString();
}
