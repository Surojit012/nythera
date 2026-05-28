import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      believers: [],
      reason: 'Supabase is not configured; using local fallback believers.',
    });
  }

  try {
    const { data, error } = await supabase
      .from('early_believers')
      .select('quote, display_name, role, avatar')
      .eq('published', true)
      .order('display_order', { ascending: true })
      .limit(6);

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      believers: (data ?? []).map((row) => ({
        text: row.quote,
        name: row.display_name,
        role: row.role,
        avatar: row.avatar,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Could not load early believers.' },
      { status: 500 },
    );
  }
}
