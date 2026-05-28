import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: unknown;
      source?: unknown;
    };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ ok: false, error: 'Enter a valid email address.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({
        ok: false,
        skipped: true,
        error: 'Waitlist storage is not configured.',
      });
    }

    const source = typeof body.source === 'string' && body.source.trim()
      ? body.source.trim().slice(0, 80)
      : 'landing';

    const { error } = await supabase
      .from('early_access_signups')
      .upsert(
        {
          email,
          source,
          metadata: {
            userAgent: request.headers.get('user-agent') ?? undefined,
            referrer: request.headers.get('referer') ?? undefined,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email' },
      );

    if (error) throw error;

    const { count } = await supabase
      .from('early_access_signups')
      .select('id', { count: 'exact', head: true });

    return NextResponse.json({ ok: true, email, count: count ?? null });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Could not join the waitlist.' },
      { status: 500 },
    );
  }
}
