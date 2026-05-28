'use client';

import React from 'react';
import Link from 'next/link';

interface AppTopBarProps {
  title: string;
  subtitle?: string;
  address?: string;
  rightSlot?: React.ReactNode;
  mobileOpen?: boolean;
  onMenuToggle?: () => void;
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function AppTopBar({
  title,
  subtitle,
  address,
  rightSlot,
  mobileOpen,
  onMenuToggle,
}: AppTopBarProps) {
  return (
    <header className="sticky top-2 z-30 mx-2 mt-2 rounded-2xl border border-ink/[0.08] bg-offwhite/88 shadow-[0_18px_50px_rgba(26,26,26,0.08)] backdrop-blur-xl sm:top-4 sm:mx-4 sm:mt-4 md:mx-8">
      <div className="flex items-center justify-between px-3 py-3 sm:px-4 sm:py-3.5 md:px-6">
        <div className="flex items-center gap-3 min-w-0">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="shrink-0 rounded-lg border border-ink/[0.10] bg-white/45 p-1.5 text-ink hover:bg-white/75 transition lg:hidden"
              aria-label="Open navigation"
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
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}
          <div className="min-w-0">
            <h1 className="ny-heading truncate text-lg">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 hidden max-w-xl truncate text-xs text-ink/50 sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>



        <div className="shrink-0 ml-4 flex items-center gap-3">
          {rightSlot}
          {address && (
            <Link href="/wallet" className="hidden items-center gap-2 rounded-lg border border-ink/[0.08] bg-white/45 px-2.5 py-1.5 transition hover:bg-white/70 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-sage animate-pulse-dot" />
              <span className="font-mono text-xs tracking-wide text-ink/70">
                {truncateAddress(address)}
              </span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
