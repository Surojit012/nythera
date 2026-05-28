'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Sidebar from '@/components/app/Sidebar';
import AppTopBar from '@/components/app/AppTopBar';
import { LockIcon } from '@/components/ui/Icons';
import { useNytheraWallet } from '@/lib/hooks/use-nythera-wallet';

const WalletButton = dynamic(() => import('@/components/WalletButton'), {
  ssr: false,
  loading: () => (
    <button className="ny-button opacity-50">
      Connect Wallet
    </button>
  ),
});

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!privyAppId) {
    return <MissingPrivyConfig />;
  }

  return <ConnectedAppLayout>{children}</ConnectedAppLayout>;
}

function ConnectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { authenticated } = usePrivy();
  const { activeAddress: address } = useNytheraWallet();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!authenticated) {
    return (
      <div className="ny-app-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4 text-ink">
        <div className="pointer-events-none fixed inset-0">
          <div className="nythera-noise absolute inset-0 opacity-[0.035]" />
        </div>

        <div className="ny-panel relative z-10 mx-auto w-full max-w-[420px] p-6 md:p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-warm-clay/12 text-warm-clay">
              <LockIcon size={18} />
            </div>
            <div>
              <p className="ny-label">Sign in required</p>
              <p className="mt-1 text-xs text-ink/50">Create or open your recovery account</p>
            </div>
          </div>

          <h2 className="ny-heading text-xl">
            Sign in to Nythera
          </h2>

          <p className="mt-3 text-sm leading-6 text-ink/60">
            Use email, Google, or an existing wallet. Nythera will create an in-app wallet for email signups where supported.
          </p>

          <div className="mt-6">
            <WalletButton />
          </div>

          <p className="mt-6 border-t border-ink/[0.08] pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink/45">
            Encrypted recovery vaults
          </p>
        </div>
      </div>
    );
  }

  const pathname = usePathname();

  // Determine top bar title and subtitle dynamically based on pathname
  let topBarTitle = 'Dashboard';
  let topBarSubtitle = 'Encrypted backups and trusted recovery';

  if (pathname.startsWith('/vault/create')) {
    topBarTitle = 'Create Vault';
    topBarSubtitle = 'Establish a secure timelock recovery vault';
  } else if (pathname.startsWith('/recover')) {
    topBarTitle = 'Recovery';
    topBarSubtitle = 'Reconstruct and recover your secure vault';
  } else if (pathname.startsWith('/wallet')) {
    topBarTitle = 'Wallet';
    topBarSubtitle = 'Manage your Story testnet keys and credits';
  } else if (pathname.match(/^\/vault\/[^\/]+$/)) {
    topBarTitle = 'Vault Details';
    topBarSubtitle = 'Inspect and manage your secure vault';
  }

  return (
    <div className="ny-app-shell relative flex min-h-screen overflow-hidden text-ink">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="nythera-noise absolute inset-0 opacity-[0.025]" />
      </div>
      <Sidebar
        address={address}
        isConnected={authenticated}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <main className="relative z-10 min-h-screen flex-1 overflow-x-hidden lg:ml-[232px]">
        <AppTopBar
          title={topBarTitle}
          subtitle={topBarSubtitle}
          mobileOpen={mobileOpen}
          onMenuToggle={() => setMobileOpen(!mobileOpen)}
          rightSlot={
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/vault/create"
                className="ny-button min-h-0 px-3.5 py-1.5 text-[0.78rem]"
              >
                Create Vault
              </Link>
              <WalletButton />
            </div>
          }
        />
        <div className="px-2 py-5 sm:px-4 sm:py-6 md:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function MissingPrivyConfig() {
  return (
    <div className="ny-app-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4 text-ink">
      <div className="pointer-events-none fixed inset-0">
        <div className="nythera-noise absolute inset-0 opacity-[0.035]" />
      </div>

      <div className="ny-panel relative z-10 mx-auto w-full max-w-[420px] p-6 md:p-7">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-dusty-rose/35 text-red-700">
            <LockIcon size={18} />
          </div>
          <div>
            <p className="ny-label">Wallet unavailable</p>
            <p className="mt-1 text-xs text-ink/50">Configuration required</p>
          </div>
        </div>
        <h2 className="ny-heading text-xl">
          Privy is not configured
        </h2>
        <p className="mt-3 text-sm leading-6 text-ink/60">
          Add `NEXT_PUBLIC_PRIVY_APP_ID` to your environment and restart the dev server to enable wallet login.
        </p>
        <button type="button" disabled className="ny-button mt-6 opacity-50">
          Connect Wallet
        </button>
        <p className="mt-6 border-t border-ink/[0.08] pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink/45">
          Missing NEXT_PUBLIC_PRIVY_APP_ID
        </p>
      </div>
    </div>
  );
}
