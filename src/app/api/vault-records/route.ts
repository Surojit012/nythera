import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createVaultRecord, listVaultsForWallet } from '@/lib/supabase/vault-records';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      vaults: [],
      reason: 'Supabase is not configured; vault metadata can only be read from this browser.',
    });
  }

  try {
    const wallet = request.nextUrl.searchParams.get('wallet')?.trim();
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return NextResponse.json({ ok: false, error: 'wallet is required.' }, { status: 400 });
    }

    const vaults = await listVaultsForWallet(supabase, wallet);
    return NextResponse.json({ ok: true, vaults });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to list vault records.' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: 'Supabase is not configured; vault metadata was saved locally only.',
    });
  }

  try {
    const body = await request.json();
    const record = await createVaultRecord(supabase, body);
    return NextResponse.json({ ok: true, record });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to create vault record.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = getSupabaseAdmin();

  try {
    const body = (await request.json().catch(() => ({}))) as {
      cdrUuid?: number;
      localVaultId?: string;
    };

    if (!supabase) {
      return NextResponse.json({
        ok: false,
        skipped: true,
        reason: 'Supabase is not configured; vault was deleted locally only.',
      });
    }

    if (!body.cdrUuid && !body.localVaultId) {
      return NextResponse.json(
        { ok: false, error: 'cdrUuid or localVaultId is required.' },
        { status: 400 },
      );
    }

    let query = supabase.from('vault_records').delete();
    if (body.cdrUuid) {
      query = query.eq('cdr_uuid', body.cdrUuid);
    } else if (body.localVaultId) {
      query = query.eq('local_vault_id', body.localVaultId);
    }
    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to delete vault record.' },
      { status: 500 },
    );
  }
}
