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
  const { authenticated, login } = usePrivy();
  const { activeAddress: address } = useNytheraWallet();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!authenticated) {
    return (
      <div className="relative flex min-h-screen flex-col justify-between bg-offwhite px-6 py-8 text-ink">
        {/* Subtle noise background */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="nythera-noise absolute inset-0 opacity-[0.03]" />
        </div>

        {/* Top Header: Logo */}
        <header className="relative z-10 mx-auto w-full max-w-7xl">
          <Link href="/" className="font-cinzel text-xl font-extrabold tracking-[-0.03em] text-ink hover:opacity-80 transition-opacity">
            nythera
          </Link>
        </header>

        {/* Centered Sign In Card */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center my-10">
          <div className="w-full max-w-[500px] rounded-[24px] border border-ink/[0.06] bg-white p-8 sm:p-10 md:p-12 shadow-[0_20px_50px_rgba(26,26,26,0.035)]">
            <h1 className="font-display text-[2rem] font-bold text-ink leading-tight mb-8">
              Sign in
            </h1>

            {/* Input 1: Connect Wallet (styled like Slite input field) */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink/45">
                Connect your identity
              </label>
              <button
                onClick={login}
                className="group w-full flex items-center justify-between rounded-xl border border-ink/[0.12] bg-white px-4 py-3.5 text-left text-sm text-ink/40 transition-all hover:border-ink hover:text-ink/80 hover:shadow-sm cursor-pointer"
              >
                <span>name@company.com / connect wallet</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink/5 text-ink transition-colors group-hover:bg-ink group-hover:text-offwhite">
                  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
                    <path d="M4.5 11.5L11.5 4.5M6 4.5H11.5V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
              <p className="text-[11px] leading-relaxed text-ink/40 mt-1.5">
                Enter your email or connect a wallet. Nythera secures your access with keyless and non-custodial cryptography.
              </p>
            </div>

            {/* Elegant Divider */}
            <div className="relative my-8 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-ink/[0.08]" />
              </div>
              <span className="relative bg-white px-4 font-mono text-[10px] uppercase tracking-widest text-ink/35">
                or
              </span>
            </div>

            {/* Input 2: Recovery Domain (styled like Slite subdomain input field) */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink/45">
                Use your recovery domain
              </label>
              <Link
                href="/recover"
                className="w-full flex items-center justify-between rounded-xl border border-ink/[0.12] bg-white px-4 py-3.5 text-left text-sm text-ink/40 transition-all hover:border-ink hover:text-ink/80 hover:shadow-sm"
              >
                <span>vault-subdomain</span>
                <span className="font-mono text-xs text-ink/45 bg-ink/5 px-2 py-0.5 rounded">.nythera</span>
              </Link>
            </div>
          </div>

          {/* Under-card Text */}
          <p className="mt-8 text-center text-xs text-ink/50">
            Need to secure a new seed phrase?{' '}
            <Link href="/#how-it-works" className="underline underline-offset-2 font-medium text-ink/70 hover:text-ink transition-colors">
              Learn how it works
            </Link>
          </p>
        </main>

        {/* Footer */}
        <footer className="relative z-10 w-full max-w-7xl mx-auto flex items-center justify-center text-[10px] uppercase tracking-wider text-ink/30 font-mono">
          <span>© {new Date().getFullYear()} Nythera — Encrypted Recovery Vaults</span>
        </footer>
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
