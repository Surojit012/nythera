'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useNytheraWallet } from '@/lib/hooks/use-nythera-wallet';

export default function WalletButton() {
  const { login, logout, authenticated } = usePrivy();
  const { activeAddress: address, isEmbedded } = useNytheraWallet();
  const isConnected = authenticated && Boolean(address);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isConnected && address) {
    const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-ink/[0.08] bg-white/45 px-2.5 py-1.5 font-mono text-xs tracking-wide text-ink/70 transition hover:border-warm-clay/45 hover:bg-white/70 hover:text-ink"
          aria-expanded={showDropdown}
          aria-haspopup="menu"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-sage animate-pulse-dot" />
          {truncated}
        </button>
        {showDropdown && (
          <div
            className="absolute right-0 top-full z-50 mt-2 min-w-[180px] overflow-hidden rounded-lg border border-ink/[0.08] bg-offwhite/95 py-1 text-ink shadow-2xl shadow-ink/15 backdrop-blur-xl"
            role="menu"
          >
            <button
              onClick={() => { login(); setShowDropdown(false); }}
              className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-white/60"
              role="menuitem"
            >
              Account
            </button>
            <Link
              href="/wallet"
              onClick={() => setShowDropdown(false)}
              className="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-white/60"
              role="menuitem"
            >
              Wallet
            </Link>
            <div className="px-3 py-2 font-mono text-[11px] text-ink/45">
              {isEmbedded ? 'Nythera wallet' : 'Connected wallet'}
            </div>
            <button
              onClick={() => { logout(); setShowDropdown(false); }}
              className="w-full px-3 py-2 text-left text-sm text-red-700 transition-colors hover:bg-red-400/10"
              role="menuitem"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        login();
      }}
      className="ny-button"
    >
      Connect Wallet
    </button>
  );
}
