'use client';

import { useState, useEffect } from 'react';
import MobileMenu from './MobileMenu';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const WalletButton = dynamic(() => import('./WalletButton'), {
  ssr: false,
  loading: () => (
    <button className="font-display text-[0.85rem] font-bold px-5 py-2.5 bg-ink text-offwhite border-none cursor-pointer tracking-[0.05em] uppercase opacity-50">
      Connect Wallet
    </button>
  ),
});

const navLinks = [
  { href: '/#problem', label: 'The Problem' },
  { href: '/#solution', label: 'Solution' },
  { href: '/#how', label: 'How It Works' },
  { href: '/#tech', label: 'Technology' },
  { href: '/#guardians', label: 'Guardians' },
];

const sectionColors: Record<string, string> = {
  hero: 'bg-offwhite/85',
  problem: 'bg-sage/85',
  solution: 'bg-offwhite/85',
  how: 'bg-dusty-rose/85',
  tech: 'bg-slate-blue/85',
  usecases: 'bg-pale-teal/85',
  guardians: 'bg-warm-clay/[0.82]',
  trust: 'bg-charcoal/[0.92]',
  cta: 'bg-offwhite/85',
};

const darkSections = new Set(['trust', 'guardians']);

export default function Navbar() {
  const [activeSection, setActiveSection] = useState('hero');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const sectionIds = ['hero', 'problem', 'solution', 'how', 'tech', 'usecases', 'guardians', 'stats-bar', 'trust', 'cta'];

    function updateNav() {
      let active = 'hero';
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 80) {
          active = id;
        }
      }
      setActiveSection(active);
    }

    window.addEventListener('scroll', updateNav, { passive: true });
    updateNav();
    return () => window.removeEventListener('scroll', updateNav);
  }, []);

  const isDark = darkSections.has(activeSection);
  const bgClass = sectionColors[activeSection] || 'bg-offwhite/85';

  return (
    <>
      <nav
        id="main-nav"
        className={`relative z-[1000] px-6 md:px-16 lg:px-24 py-4 flex items-center justify-between backdrop-blur-2xl transition-all duration-500 ${bgClass}`}
      >
        <Link
          href="/"
          className={`font-display font-extrabold text-[1.4rem] tracking-tight no-underline transition-colors duration-500 ${
            isDark ? 'text-offwhite' : 'text-ink'
          }`}
        >
          Nyth<span className="text-warm-clay">era</span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex gap-10 list-none items-center m-0 p-0">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className={`font-body text-[0.9rem] font-medium no-underline tracking-[0.02em] opacity-75 hover:opacity-100 transition-all duration-300 ${
                  isDark ? 'text-offwhite' : 'text-ink'
                }`}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-4">
          <a
            href="/dashboard"
            className={`font-display text-[0.85rem] font-bold px-5 py-2.5 bg-warm-clay text-ink border-none cursor-pointer tracking-[0.05em] uppercase transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg inline-block`}
          >
            Open App
          </a>
          <WalletButton />
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className={`md:hidden w-8 h-8 flex flex-col items-center justify-center gap-1.5 ${
            isDark ? 'text-offwhite' : 'text-ink'
          }`}
          aria-label="Open menu"
        >
          <span className="w-5 h-px bg-current" />
          <span className="w-4 h-px bg-current" />
          <span className="w-5 h-px bg-current" />
        </button>
      </nav>

      {/* Mobile menu */}
      <MobileMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)}>
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={() => setMobileOpen(false)}
            className="font-body text-base font-medium text-ink/75 hover:text-ink py-3 border-b border-ink/5 no-underline transition-colors"
          >
            {link.label}
          </a>
        ))}
        <div className="mt-6 flex flex-col gap-3">
          <a
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="text-center font-display text-[0.85rem] font-bold px-5 py-2.5 bg-warm-clay text-ink border-none cursor-pointer tracking-[0.05em] uppercase transition-all duration-200 hover:-translate-y-0.5"
          >
            Open App
          </a>
          <WalletButton />
        </div>
      </MobileMenu>
    </>
  );
}
