'use client';

import { ReactNode } from 'react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function MobileMenu({ isOpen, onClose, children }: MobileMenuProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-ink/60 backdrop-blur-sm z-[998] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[280px] bg-offwhite z-[999] transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-ink/10">
          <span className="font-display font-extrabold text-lg tracking-tight">
            Nyth<span className="text-warm-clay">era</span>
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-ink/60 hover:text-ink transition-colors"
            aria-label="Close menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="1" y1="1" x2="17" y2="17" />
              <line x1="17" y1="1" x2="1" y2="17" />
            </svg>
          </button>
        </div>

        <nav className="p-6 flex flex-col gap-1">
          {children}
        </nav>
      </div>
    </>
  );
}
