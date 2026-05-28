import { NextResponse } from 'next/server';
import { isSmtpConfigured } from '@/lib/email/smtp';
import { getWalrusAggregatorUrl, getWalrusNetwork, getWalrusPublisherUrl } from '@/lib/walrus/client';

export const runtime = 'nodejs';

export async function GET() {
  const publisherUrl = getWalrusPublisherUrl();
  const usingPublicPublisher = publisherUrl.includes('walrus-testnet.walrus.space') || publisherUrl.includes('walrus-mainnet.walrus.space');

  return NextResponse.json({
    supabase: {
      url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      anonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      serviceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      ready: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    cdr: {
      accessConditionV3: Boolean(process.env.NEXT_PUBLIC_ACCESS_CONDITION_V3),
      accessConditionV2: Boolean(process.env.NEXT_PUBLIC_ACCESS_CONDITION_V2),
      legacyWhitelistCondition: Boolean(process.env.NEXT_PUBLIC_WHITELIST_CONDITION),
      twoConfirmationCreateReady: false,
    },
    walrus: {
      network: getWalrusNetwork(),
      publisherUrl,
      aggregatorUrl: getWalrusAggregatorUrl(),
      sponsorPrivateKey: Boolean(process.env.WALRUS_SPONSOR_PRIVATE_KEY),
      renewUrl: Boolean(process.env.WALRUS_RENEW_URL),
      uploadReady: true,
      publicPublisherMode: usingPublicPublisher,
      customPublisherConfigured: Boolean(process.env.WALRUS_PUBLISHER_URL) && !usingPublicPublisher,
      renewalReady: Boolean(process.env.WALRUS_RENEW_URL),
    },
    smtp: {
      ready: isSmtpConfigured(),
      host: Boolean(process.env.SMTP_HOST),
      from: Boolean(process.env.SMTP_FROM),
    },
    ops: {
      adminApiKey: Boolean(process.env.ADMIN_API_KEY),
      cronSecret: Boolean(process.env.CRON_SECRET),
    },
  });
}
