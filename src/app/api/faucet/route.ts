import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http, parseEther, isAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const DRIP_AMOUNT = '0.5'; // IP tokens per faucet claim
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// In-memory rate limit fallback when Supabase is unavailable.
// Resets on each serverless cold start — Supabase is the source of truth.
const memoryDrips = new Map<string, number>();

// Story Aeneid Testnet chain definition for viem
const storyAeneidChain = {
  id: 1315,
  name: 'Story Aeneid Testnet',
  nativeCurrency: { name: 'IP', symbol: 'IP', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://aeneid.storyrpc.io'] as const },
  },
} as const;

/**
 * Check if the wallet has claimed within the last 24 hours.
 * Returns the timestamp of the last drip if within cooldown, or null if eligible.
 */
async function getLastDrip(wallet: string): Promise<number | null> {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const cutoff = new Date(Date.now() - COOLDOWN_MS).toISOString();
    const { data } = await supabase
      .from('faucet_drips')
      .select('created_at')
      .eq('wallet', wallet.toLowerCase())
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      return new Date(data[0].created_at).getTime();
    }
    return null;
  }

  // Fallback: in-memory rate limiting
  const lastDrip = memoryDrips.get(wallet.toLowerCase());
  if (lastDrip && Date.now() - lastDrip < COOLDOWN_MS) {
    return lastDrip;
  }
  return null;
}

/**
 * Record a successful faucet drip.
 */
async function recordDrip(wallet: string, txHash: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    await supabase.from('faucet_drips').insert({
      wallet: wallet.toLowerCase(),
      amount: DRIP_AMOUNT,
      tx_hash: txHash,
    });
  }

  // Always update in-memory as well for immediate rate limiting
  memoryDrips.set(wallet.toLowerCase(), Date.now());
}

export async function POST(request: NextRequest) {
  // --- Validate env ---
  const faucetKey = process.env.FAUCET_PRIVATE_KEY;
  if (!faucetKey) {
    return NextResponse.json(
      { error: 'Faucet is not configured on this server.' },
      { status: 503 },
    );
  }

  // --- Parse body ---
  let body: { wallet?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const wallet = body.wallet?.trim();
  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json(
      { error: 'A valid wallet address is required.' },
      { status: 400 },
    );
  }

  // --- Rate limit check ---
  try {
    const lastDripTime = await getLastDrip(wallet);
    if (lastDripTime !== null) {
      const nextEligible = lastDripTime + COOLDOWN_MS;
      const remainingMs = nextEligible - Date.now();
      const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
      return NextResponse.json(
        {
          error: 'You have already claimed faucet tokens in the last 24 hours.',
          nextEligible,
          remainingHours,
        },
        { status: 429 },
      );
    }
  } catch (err) {
    // If rate limit check fails, allow the drip (fail-open for UX)
    console.warn('[faucet] Rate limit check failed, proceeding:', err);
  }

  // --- Send transaction ---
  try {
    const formattedKey = faucetKey.startsWith('0x') ? faucetKey : `0x${faucetKey}`;
    const account = privateKeyToAccount(formattedKey as `0x${string}`);

    const client = createWalletClient({
      account,
      chain: storyAeneidChain,
      transport: http('https://aeneid.storyrpc.io'),
    });

    const txHash = await client.sendTransaction({
      to: wallet as `0x${string}`,
      value: parseEther(DRIP_AMOUNT),
    });

    // Record the drip
    await recordDrip(wallet, txHash);

    return NextResponse.json({
      ok: true,
      txHash,
      amount: DRIP_AMOUNT,
      message: `Sent ${DRIP_AMOUNT} IP to ${wallet}`,
    });
  } catch (err) {
    console.error('[faucet] Transaction failed:', err);

    const message =
      err instanceof Error ? err.message : 'Transaction failed. The faucet wallet may be empty.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
