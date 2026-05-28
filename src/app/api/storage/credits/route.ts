import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ensureStorageAccount } from '@/lib/supabase/vault-records';
import { getDefaultWalrusEpochs } from '@/lib/walrus/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet')?.trim().toLowerCase();
  const requiredForUpload = getDefaultWalrusEpochs();

  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'wallet is required.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      balance: null,
      requiredForUpload,
      reason: 'Supabase is not configured; storage credits are not tracked in this environment.',
    });
  }

  try {
    const account = await ensureStorageAccount(supabase, wallet);
    return NextResponse.json({
      ok: true,
      wallet,
      balance: account.credits_balance as number,
      requiredForUpload,
      topUpMode: 'admin_manual',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load storage credits.' },
      { status: 500 },
    );
  }
}
