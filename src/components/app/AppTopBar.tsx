'use client';

import React from 'react';
import Link from 'next/link';

interface AppTopBarProps {
  title: string;
  subtitle?: string;
  address?: string;
  rightSlot?: React.ReactNode;
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function AppTopBar({ title, subtitle, address, rightSlot }: AppTopBarProps) {
  return (
    <header className="sticky top-4 z-30 mx-4 mt-4 rounded-2xl border border-ink/[0.08] bg-offwhite/88 shadow-[0_18px_50px_rgba(26,26,26,0.08)] backdrop-blur-xl md:mx-8">
      <div className="flex items-center justify-between px-4 py-3.5 md:px-6">
        <div className="min-w-0 pl-12 lg:pl-0">
          <h1 className="ny-heading truncate text-lg">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 hidden max-w-xl truncate text-xs text-ink/50 sm:block">
              {subtitle}
            </p>
          )}
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
