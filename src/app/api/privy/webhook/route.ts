import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

interface PrivyWebhookPayload {
  id: string;
  type: string;
  data: {
    id: string; // Privy DID
    linked_accounts?: Array<{
      type: 'email' | 'wallet' | string;
      address?: string;
      verified_at?: number;
      chain_type?: string;
    }>;
  };
}

// Manual Svix webhook signature verification
function verifySvixSignature({
  payload,
  headers,
  secret,
}: {
  payload: string;
  headers: Headers;
  secret: string;
}): boolean {
  const svixId = headers.get('svix-id');
  const svixTimestamp = headers.get('svix-timestamp');
  const svixSignature = headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return false;
  }

  // Prevent replay attacks (within 5 minutes / 300 seconds)
  const now = Math.floor(Date.now() / 1000);
  const timestamp = parseInt(svixTimestamp, 10);
  if (isNaN(timestamp) || Math.abs(now - timestamp) > 300) {
    return false;
  }

  // Standard Privy webhook secret is prefixed with "whsec_"
  // Strip "whsec_" and base64-decode the remainder to get the key bytes
  let secretKey: Buffer;
  if (secret.startsWith('whsec_')) {
    secretKey = Buffer.from(secret.split('_')[1], 'base64');
  } else {
    secretKey = Buffer.from(secret, 'base64');
  }

  const toSign = `${svixId}.${svixTimestamp}.${payload}`;
  const calculatedSig = crypto
    .createHmac('sha256', secretKey)
    .update(toSign)
    .digest('base64');

  const signatures = svixSignature.split(' ');
  return signatures.some((sigStr) => {
    const parts = sigStr.split(',');
    if (parts.length !== 2 || parts[0] !== 'v1') return false;
    const sig = parts[1];

    const expectedBuffer = Buffer.from(calculatedSig, 'base64');
    const actualBuffer = Buffer.from(sig, 'base64');
    if (expectedBuffer.length !== actualBuffer.length) return false;
    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  });
}

export async function POST(request: NextRequest) {
  const secret = process.env.PRIVY_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'PRIVY_WEBHOOK_SIGNING_SECRET is not configured on the server.' },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const headersObj = request.headers;

  // Verify the signature
  const isVerified = verifySvixSignature({
    payload: rawBody,
    headers: headersObj,
    secret,
  });

  if (!isVerified) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody) as PrivyWebhookPayload;
    const eventType = payload.type;

    if (eventType !== 'user.created' && eventType !== 'user.updated') {
      return NextResponse.json({ ok: true, message: `Ignored unhandled event type: ${eventType}` });
    }

    const privyUserId = payload.data.id;
    const linkedAccounts = payload.data.linked_accounts || [];

    // Find the linked email (if any)
    const emailAccount = linkedAccounts.find((account) => account.type === 'email');
    const emailAddress = emailAccount?.address ? emailAccount.address.trim().toLowerCase() : null;

    // Find all linked wallets (chain_type = 'ethereum' or containing an address)
    const walletAccounts = linkedAccounts.filter(
      (account) =>
        account.type === 'wallet' &&
        account.address &&
        /^0x[a-fA-F0-9]{40}$/.test(account.address),
    );

    if (walletAccounts.length === 0) {
      return NextResponse.json({ ok: true, message: 'No linked EVM wallet address found in the event.' });
    }

    const supabase = requireSupabaseAdmin();
    const syncedWallets: string[] = [];

    // Sync each linked wallet address to user_storage_accounts
    for (const wallet of walletAccounts) {
      const walletAddress = wallet.address!.toLowerCase();

      // Check if storage account already exists for this wallet
      const { data: existing, error: readError } = await supabase
        .from('user_storage_accounts')
        .select('*')
        .eq('wallet_address', walletAddress)
        .maybeSingle();

      if (readError) {
        console.error(`Error reading storage account for ${walletAddress}:`, readError);
        continue;
      }

      if (existing) {
        const { error: updateError } = await supabase
          .from('user_storage_accounts')
          .update({
            privy_user_id: privyUserId,
            email: emailAddress || existing.email,
            updated_at: new Date().toISOString(),
          })
          .eq('wallet_address', walletAddress);

        if (updateError) {
          console.error(`Error updating storage account for ${walletAddress}:`, updateError);
        } else {
          syncedWallets.push(walletAddress);
        }
      } else {
        const { error: insertError } = await supabase
          .from('user_storage_accounts')
          .insert({
            wallet_address: walletAddress,
            privy_user_id: privyUserId,
            email: emailAddress,
            credits_balance: 2,
          });

        if (insertError) {
          console.error(`Error inserting storage account for ${walletAddress}:`, insertError);
        } else {
          syncedWallets.push(walletAddress);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      privyUserId,
      syncedWallets,
    });
  } catch (error) {
    console.error('Privy Webhook handler error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook execution failed.' },
      { status: 500 },
    );
  }
}
