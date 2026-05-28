'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { VaultIcon, LockIcon, KeyIcon, WalletIcon } from '@/components/ui/Icons';
import { useStorageCredits } from '@/lib/hooks/use-storage-credits';

interface SidebarProps {
  address?: string;
  isConnected: boolean;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.FC<{ size?: number; className?: string }>;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: VaultIcon },
  { label: 'Create Vault', href: '/vault/create', icon: LockIcon },
  { label: 'Recovery', href: '/recover', icon: KeyIcon },
  { label: 'Wallet', href: '/wallet', icon: WalletIcon },
];

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function Sidebar({ address, isConnected }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = usePrivy();
  const [mobileOpen, setMobileOpen] = useState(false);
  const credits = useStorageCredits(isConnected ? address : undefined);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-5 pt-5">
        <Link href="/" className="group inline-flex">
          <span className="font-display text-sm font-bold tracking-[0.08em] text-ink">
            Nythera
          </span>
        </Link>
      </div>

      <nav className="space-y-1 px-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                group relative flex items-center gap-3 rounded-lg px-3 py-2.5
                text-sm font-medium transition-all duration-200 ease-out
                ${active
                  ? 'bg-warm-clay/15 text-ink shadow-[inset_2px_0_0_rgba(196,149,106,0.8)]'
                  : 'text-ink/50 hover:bg-white/50 hover:text-ink'
                }
              `}
            >

              <item.icon
                size={15}
                className={`shrink-0 transition-colors duration-300 ${active ? 'text-warm-clay' : 'text-ink/35 group-hover:text-ink/65'
                  }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-5 px-4">
        <div className="rounded-xl border border-ink/[0.08] bg-white/35 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/45">Backup status</p>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink/55">Storage</span>
              <span className="font-mono text-ink/70">Encrypted</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink/55">Access</span>
              <span className="font-mono text-ink/70">Guarded</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink/55">File credits</span>
              <span className="font-mono text-ink/70">
                {credits.loading
                  ? '...'
                  : credits.balance === null
                    ? credits.skipped ? 'Untracked' : '-'
                    : credits.balance}
              </span>
            </div>
          </div>
          {credits.error && (
            <p className="mt-2 text-[11px] leading-4 text-warm-clay">{credits.error}</p>
          )}
          <details className="mt-3">
            <summary className="cursor-pointer text-[10px] uppercase tracking-[0.14em] text-ink/45">Advanced</summary>
            <div className="mt-2 space-y-1 font-mono text-xs text-ink/50">
              <p>Story Aeneid test network</p>
              <p>File backup cost: {credits.requiredForUpload} credits</p>
            </div>
          </details>
        </div>
      </div>

      <div className="mt-auto px-4 pb-4">
        <div className="rounded-xl border border-ink/[0.08] bg-white/45 px-3 py-3">
          <span
            className={`mb-3 block h-1.5 w-1.5 shrink-0 rounded-full ${isConnected
              ? 'bg-sage animate-pulse-dot'
              : 'bg-ink/30'
              }`}
          />
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/45">
              Wallet
            </p>
            <p className="mt-1 truncate font-mono text-xs text-ink/70">
              {isConnected && address
                ? truncateAddress(address)
                : isConnected ? 'No wallet yet' : 'Not Connected'}
            </p>
          </div>
          {isConnected && (
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                logout();
              }}
              className="mt-3 w-full rounded-lg border border-ink/[0.10] px-3 py-2 text-left text-xs font-medium text-ink/55 transition hover:border-red-300/45 hover:bg-red-400/10 hover:text-red-700"
            >
              Disconnect wallet
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed bottom-4 left-4 top-4 z-40 hidden w-[208px] flex-col rounded-2xl border border-ink/[0.08] bg-offwhite/85 shadow-[0_18px_50px_rgba(26,26,26,0.10)] backdrop-blur-xl lg:flex">
        {sidebarContent}
      </aside>

      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-[0.625rem] top-[0.625rem] z-50 rounded-lg border border-ink/[0.10] bg-offwhite/88 p-2 text-ink shadow-lg backdrop-blur-xl sm:left-4 sm:top-[1.35rem] sm:p-2.5 lg:hidden"
        aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
      >
        <svg
          width={20}
          height={20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {mobileOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-ink/35 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          <aside className="absolute bottom-4 left-4 top-4 w-[280px] animate-fade-in-down rounded-2xl border border-ink/[0.08] bg-offwhite/95 shadow-2xl backdrop-blur-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
