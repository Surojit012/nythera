import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

type RecipientInput = {
  kind: 'wallet' | 'email';
  value: string;
  resolvedWallet: string;
};

export async function PATCH(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: 'Supabase is not configured; recipients were updated locally only.',
    });
  }

  try {
    const body = (await request.json()) as {
      cdrUuid?: number;
      recipients?: RecipientInput[];
    };

    if (!body.cdrUuid || !Number.isInteger(body.cdrUuid)) {
      return NextResponse.json({ ok: false, error: 'cdrUuid is required.' }, { status: 400 });
    }
    const recipients = body.recipients ?? [];

    const { data: vaultRecord, error: vaultError } = await supabase
      .from('vault_records')
      .select('id')
      .eq('cdr_uuid', body.cdrUuid)
      .maybeSingle();
    if (vaultError) throw vaultError;
    if (!vaultRecord?.id) {
      return NextResponse.json({ ok: false, error: 'Vault record not found for this Vault ID.' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from('vault_recipients')
      .delete()
      .eq('vault_record_id', vaultRecord.id);
    if (deleteError) throw deleteError;

    if (recipients.length > 0) {
      const { error: insertError } = await supabase.from('vault_recipients').insert(
        recipients.map((recipient) => ({
          vault_record_id: vaultRecord.id,
          kind: recipient.kind,
          value: recipient.value,
          resolved_wallet: recipient.resolvedWallet.toLowerCase(),
        })),
      );
      if (insertError) throw insertError;

      const inviteRows = recipients.filter((recipient) => recipient.kind === 'email');
      if (inviteRows.length > 0) {
        const { error: notificationError } = await supabase.from('notification_events').insert(
          inviteRows.map((recipient) => ({
            vault_record_id: vaultRecord.id,
            recipient_email: recipient.value.toLowerCase(),
            type: 'vault_invite',
          })),
        );
        if (notificationError) throw notificationError;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to update recipients.' },
      { status: 500 },
    );
  }
}
