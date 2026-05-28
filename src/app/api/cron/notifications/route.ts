import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin } from '@/lib/supabase/admin';
import { isSmtpConfigured, renderNotificationEmail, sendEmail } from '@/lib/email/smtp';

export const runtime = 'nodejs';

type NotificationRow = {
  id: string;
  recipient_email: string;
  type: string;
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
  if (!isSmtpConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'SMTP is not configured; notifications remain queued.' },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from('notification_events')
    .select('id, recipient_email, type')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(25);
  if (error) throw error;

  const results: { id: string; status: string; error?: string }[] = [];
  for (const notification of (data ?? []) as NotificationRow[]) {
    try {
      const template = renderNotificationEmail(notification.type);
      await sendEmail({ to: notification.recipient_email, ...template });
      await supabase
        .from('notification_events')
        .update({ status: 'sent', sent_at: new Date().toISOString(), error: null })
        .eq('id', notification.id);
      results.push({ id: notification.id, status: 'sent' });
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : 'Unknown email error.';
      await supabase
        .from('notification_events')
        .update({ status: 'failed', error: message })
        .eq('id', notification.id);
      results.push({ id: notification.id, status: 'failed', error: message });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
