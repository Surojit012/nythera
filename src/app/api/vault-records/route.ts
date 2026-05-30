import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createVaultRecord, listVaultsForWallet } from '@/lib/supabase/vault-records';
import { withAuth } from '@/lib/auth/server-auth';

export const runtime = 'nodejs';

export const GET = withAuth(async (request: NextRequest, auth) => {
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
    // Always use the authenticated wallet address, ignore the query param
    const wallet = auth.walletAddress;

    const vaults = await listVaultsForWallet(supabase, wallet);
    return NextResponse.json({ ok: true, vaults });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to list vault records.' },
      { status: 500 },
    );
  }
});

export const POST = withAuth(async (request: NextRequest, auth) => {
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
    // Override creatorWallet with the authenticated wallet to prevent spoofing
    body.creatorWallet = auth.walletAddress;
    const record = await createVaultRecord(supabase, body);
    return NextResponse.json({ ok: true, record });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to create vault record.' },
      { status: 500 },
    );
  }
});

export const DELETE = withAuth(async (request: NextRequest, auth) => {
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

    // Verify ownership before deleting
    let lookupQuery = supabase.from('vault_records').select('id, creator_wallet');
    if (body.cdrUuid) {
      lookupQuery = lookupQuery.eq('cdr_uuid', body.cdrUuid);
    } else if (body.localVaultId) {
      lookupQuery = lookupQuery.eq('local_vault_id', body.localVaultId);
    }

    const { data: record, error: lookupError } = await lookupQuery.maybeSingle();
    if (lookupError) throw lookupError;

    if (!record) {
      return NextResponse.json(
        { ok: false, error: 'Vault record not found.' },
        { status: 404 },
      );
    }

    if (record.creator_wallet?.toLowerCase() !== auth.walletAddress) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden: you are not the owner of this vault.' },
        { status: 403 },
      );
    }

    const { error } = await supabase.from('vault_records').delete().eq('id', record.id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to delete vault record.' },
      { status: 500 },
    );
  }
});
