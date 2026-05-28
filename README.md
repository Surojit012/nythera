This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## CDR Integration (Story)

This project now includes a CDR integration layer in:

- `src/lib/crypto/cdr.ts`
- `src/lib/crypto/vault.ts` (`createVaultWithCDR`, `recoverVaultWithCDR`)

### Install

```bash
npm install @piplabs/cdr-sdk viem
```

### Minimal usage

```ts
import { createCDRClient } from '@/lib/crypto/cdr';
import { createVaultWithCDR, recoverVaultWithCDR } from '@/lib/crypto/vault';

const cdrClient = await createCDRClient({
  network: 'testnet',
  apiUrl: '/api/cdr',
  publicClient,
  walletClient,
});

const { vault } = await createVaultWithCDR(seedPhrase, ownerAddress, guardians, {
  client: cdrClient,
  publicClient,
  walletClient,
  recipientAddresses,
  recipientEmails,
  resolvedEmailWallets,
  accessConditionAddress: process.env.NEXT_PUBLIC_ACCESS_CONDITION_V2 as `0x${string}`,
  whitelistConditionAddress: process.env.NEXT_PUBLIC_WHITELIST_CONDITION as `0x${string}`,
});

const recovered = await recoverVaultWithCDR(vault, cdrClient);
```

### Storage model

- Text secrets: encrypted by CDR and stored as Story CDR vault payloads.
- Image/file secrets under 10MB: encrypted locally with AES-GCM, uploaded to Walrus as ciphertext, and the Walrus pointer plus AES key/IV is stored inside the Story CDR payload.
- App metadata: stored in Supabase Postgres when configured, with localStorage as the local UX cache.
- Access: new vaults can use `AccessConditionV2` to encode initial creator/guardian access during CDR allocation; legacy vaults continue using `WhitelistCondition`.
- Renewal: Walrus storage is renewable, not permanent. Supabase tracks credits, renewal mode, expiry, and notification rows.

### Walrus + Supabase env

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_ACCESS_CONDITION_V2=
NEXT_PUBLIC_WHITELIST_CONDITION=
WALRUS_NETWORK=testnet
WALRUS_DEFAULT_EPOCHS=2
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
WALRUS_SPONSOR_PRIVATE_KEY=
WALRUS_RENEW_URL=
ADMIN_API_KEY=
CRON_SECRET=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Nythera <no-reply@nythera.local>"
```

Run `supabase/migrations/001_walrus_renewal_vaults.sql` and `supabase/migrations/002_access_condition_v2.sql` before enabling production metadata/credits.

`WALRUS_RENEW_URL` is intentionally separate: uploads and downloads can use the Walrus HTTP publisher/aggregator, while extending an existing Walrus object should be handled by a sponsor-wallet backend worker.

For development, the default testnet public publisher can accept uploads. For the production hybrid-credit model, run or rent a Walrus publisher/worker funded by Nythera's sponsor wallet and set `WALRUS_PUBLISHER_URL` to that service. That is the piece that makes Nythera, not the end user, pay the WAL/SUI side.

### Operational routes

- `GET /api/setup/status` checks whether Supabase, Walrus, SMTP, and ops secrets are configured.
- `POST /api/cron/renewals` scans expiring Walrus-backed vaults and queues notifications or auto-renewals.
- `POST /api/cron/notifications` sends queued notification rows through SMTP.
- `POST /api/admin/credits/grant` grants v1 manual storage credits with `x-admin-key: ADMIN_API_KEY`.

### Notes

- Two-confirmation vault creation requires deploying `AccessConditionV2` and setting `NEXT_PUBLIC_ACCESS_CONDITION_V2`.
- `NEXT_PUBLIC_WHITELIST_CONDITION` remains required for legacy vault editing/recovery until old vaults are no longer supported.
- Email recipients require `PRIVY_APP_SECRET` so the server can resolve emails to Privy wallets.
- Supabase never stores plaintext secrets or file AES keys.
- `accessAuxData` defaults to `0x`, but can be customized for advanced access control patterns.
- Existing local AES + Shamir flow remains unchanged (`createVault`, `recoverVault`).
