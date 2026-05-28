import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin } from '@/lib/supabase/admin';
import { grantCredits } from '@/lib/supabase/vault-records';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    return NextResponse.json({ error: 'ADMIN_API_KEY is not configured.' }, { status: 503 });
  }
  if (request.headers.get('x-admin-key') !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { walletAddress?: string; credits?: number; note?: string };
    if (!body.walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(body.walletAddress)) {
      return NextResponse.json({ error: 'walletAddress must be a valid EVM address.' }, { status: 400 });
    }
    const credits = Number(body.credits);
    if (!Number.isInteger(credits) || credits <= 0) {
      return NextResponse.json({ error: 'credits must be a positive integer.' }, { status: 400 });
    }

    const balance = await grantCredits(requireSupabaseAdmin(), body.walletAddress, credits, body.note);
    return NextResponse.json({ ok: true, walletAddress: body.walletAddress.toLowerCase(), balance });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to grant credits.' },
      { status: 500 },
    );
  }
}
