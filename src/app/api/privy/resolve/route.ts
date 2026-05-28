import { NextRequest, NextResponse } from 'next/server';
import { EMAIL_RE } from '@/lib/recipients';

const PRIVY_API = 'https://auth.privy.io/api/v1/users';
const MAX_EMAILS = 5;

type PrivyLinkedAccount = { type: string; address?: string };
type PrivyUserResponse = {
  linked_accounts?: PrivyLinkedAccount[];
};

async function resolveEmail(
  email: string,
  appId: string,
  appSecret: string,
): Promise<`0x${string}`> {
  const response = await fetch(PRIVY_API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'privy-app-id': appId,
      authorization: `Basic ${Buffer.from(`${appId}:${appSecret}`).toString('base64')}`,
    },
    body: JSON.stringify({
      linked_accounts: [{ type: 'email', address: email }],
      wallets: [{ chain_type: 'ethereum' }],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Privy ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as PrivyUserResponse;
  const wallet = data.linked_accounts?.find(
    (account) => account.type === 'wallet' && typeof account.address === 'string',
  );
  if (!wallet?.address) {
    throw new Error(`Privy returned no wallet for ${email}`);
  }

  return wallet.address as `0x${string}`;
}

export async function POST(request: NextRequest) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: 'Privy email resolution requires PRIVY_APP_SECRET on the server.' },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => null)) as { emails?: unknown } | null;
  if (!body || !Array.isArray(body.emails)) {
    return NextResponse.json({ error: 'emails must be an array' }, { status: 400 });
  }
  if (body.emails.length > MAX_EMAILS) {
    return NextResponse.json({ error: `maximum ${MAX_EMAILS} emails` }, { status: 400 });
  }

  const emails: string[] = [];
  for (const entry of body.emails) {
    if (typeof entry !== 'string') {
      return NextResponse.json({ error: 'emails must be strings' }, { status: 400 });
    }
    const email = entry.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: `invalid email: ${entry}` }, { status: 400 });
    }
    emails.push(email);
  }

  try {
    const results = await Promise.all(
      emails.map(async (email) => ({
        email,
        address: await resolveEmail(email, appId, appSecret),
      })),
    );
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not resolve emails via Privy' },
      { status: 502 },
    );
  }
}
