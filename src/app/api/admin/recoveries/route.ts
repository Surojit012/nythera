import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    return NextResponse.json({ error: 'ADMIN_API_KEY is not configured.' }, { status: 503 });
  }
  if (request.headers.get('x-admin-key') !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const supabase = requireSupabaseAdmin();

  try {
    // Query our new custom SQL view that joins tables
    const { data: records, error } = await supabase
      .from('vault_recovery_summary')
      .select('*')
      .order('recovered_at', { ascending: false });

    if (error) throw error;

    // Aggregate counts by gmail/email and by wallet address
    const byEmail: Record<string, number> = {};
    const byAddress: Record<string, number> = {};

    for (const row of (records ?? [])) {
      const email = row.recovered_by_email || row.vault_owner_email || 'unknown';
      const address = row.recovered_by_wallet || 'unknown';

      byEmail[email] = (byEmail[email] ?? 0) + 1;
      byAddress[address] = (byAddress[address] ?? 0) + 1;
    }

    return NextResponse.json({
      ok: true,
      total_recoveries: records?.length ?? 0,
      recoveries: records,
      aggregation: {
        by_email: byEmail,
        by_address: byAddress,
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to query recovery summary.' },
      { status: 500 },
    );
  }
}
