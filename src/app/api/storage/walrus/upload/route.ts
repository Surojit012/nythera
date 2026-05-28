import { NextRequest, NextResponse } from 'next/server';
import { MAX_WALRUS_FILE_BYTES, MAX_WALRUS_FILE_LABEL } from '@/lib/crypto/file/walrus-file';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { grantCredits, spendCredits } from '@/lib/supabase/vault-records';
import { getDefaultWalrusEpochs, uploadWalrusBlob, waitForWalrusBlob } from '@/lib/walrus/client';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get('file');
  const creatorWallet = String(form.get('creatorWallet') ?? '').toLowerCase();
  const epochs = normalizeEpochs(form.get('epochs'));

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Encrypted file bytes are required.' }, { status: 400 });
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(creatorWallet)) {
    return NextResponse.json({ error: 'creatorWallet must be a wallet address.' }, { status: 400 });
  }
  if (file.size > MAX_WALRUS_FILE_BYTES + 1024) {
    return NextResponse.json({ error: `Encrypted file must be under ${MAX_WALRUS_FILE_LABEL}.` }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  let creditsSpent = 0;
  try {
    if (supabase) {
      await spendCredits(supabase, creatorWallet, epochs, 'walrus_upload');
      creditsSpent = epochs;
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const upload = await uploadWalrusBlob(bytes, { epochs, deletable: false });
    await waitForWalrusBlob(upload.blobId, upload.objectId);
    const endDate = estimateEndDate(upload.startEpoch, upload.endEpoch, epochs);

    return NextResponse.json({
      ...upload,
      endDate,
      epochs,
      creditsSpent,
      creditsMode: supabase ? 'tracked' : 'untracked_no_supabase',
    });
  } catch (error) {
    if (supabase && creditsSpent > 0) {
      await grantCredits(supabase, creatorWallet, creditsSpent, 'refund_failed_walrus_upload').catch(() => undefined);
    }

    const message = error instanceof Error ? error.message : 'Walrus upload failed.';
    const status = message.toLowerCase().includes('insufficient storage credits') ? 402 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

function normalizeEpochs(value: FormDataEntryValue | null): number {
  const parsed = Number(value ?? getDefaultWalrusEpochs());
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : getDefaultWalrusEpochs();
}

function estimateEndDate(startEpoch: number | undefined, endEpoch: number | undefined, fallbackEpochs: number): string {
  // Mainnet Walrus epochs are roughly two weeks; testnet timing can vary, so this is UI guidance only.
  const now = Date.now();
  const epochsFromNow =
    startEpoch !== undefined && endEpoch !== undefined ? Math.max(1, endEpoch - startEpoch) : fallbackEpochs;
  return new Date(now + epochsFromNow * 14 * 24 * 60 * 60 * 1000).toISOString();
}
