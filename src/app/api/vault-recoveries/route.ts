import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { withAuth } from '@/lib/auth/server-auth';

export const runtime = 'nodejs';

export const POST = withAuth(async (request: NextRequest, auth) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: 'Supabase is not configured; recovery event saved locally only.',
    });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      localVaultId?: string;
      cdrUuid?: number;
    };

    if (!body.cdrUuid && !body.localVaultId) {
      return NextResponse.json(
        { ok: false, error: 'cdrUuid or localVaultId is required.' },
        { status: 400 },
      );
    }

    // 1. Find the vault record in Supabase
    let query = supabase.from('vault_records').select('id');
    if (body.cdrUuid) {
      query = query.eq('cdr_uuid', body.cdrUuid);
    } else if (body.localVaultId) {
      query = query.eq('local_vault_id', body.localVaultId);
    }

    const { data: record, error: findError } = await query.maybeSingle();
    if (findError) throw findError;

    if (!record) {
      return NextResponse.json(
        { ok: false, error: 'Vault record not found in Supabase.' },
        { status: 404 },
      );
    }

    // 2. Insert the recovery event – use the authenticated wallet, not body input
    const { data: event, error: insertError } = await supabase
      .from('vault_recoveries')
      .insert({
        vault_record_id: record.id,
        recovered_by_wallet: auth.walletAddress,
      })
      .select('*')
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ ok: true, event });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to record vault recovery.' },
      { status: 500 },
    );
  }
});
