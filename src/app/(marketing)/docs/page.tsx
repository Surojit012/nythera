'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// Custom icons for categories
function VisionIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
      <path fillRule="evenodd" d="M.664 9.576a1 1 0 011.664-1.152 8.002 8.002 0 0015.344 0 1 1 0 11.664 1.152 9.998 9.998 0 01-18.672 0z" clipRule="evenodd" />
    </svg>
  );
}

function ProductIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM5.47 9.47a.75.75 0 011.06 0L9 11.94l3.47-3.47a.75.75 0 111.06 1.06l-4 4a.75.75 0 01-1.06 0l-3-3a.75.75 0 010-1.06z" clipRule="evenodd" />
    </svg>
  );
}

function TechIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.033 1.41l-1.468 1.468a3.502 3.502 0 11-5.32 0L4.093 4.462a1 1 0 011.41-1.41l1.468 1.468a1.502 1.502 0 102.26 0L7.763 3.05a1 1 0 011.41-1.41l1.468 1.468a3.502 3.502 0 011.675-.057zM5 13a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  );
}

function SecurityIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5v1.071c-.886.075-1.758.214-2.605.414A1 1 0 002 8v8a2 2 0 002 2h12a2 2 0 002-2V8a1 1 0 00-.895-.986 42.42 42.42 0 00-2.605-.414V5.5A4.5 4.5 0 0010 1zm2.5 4.5v.721c-.815-.05-1.642-.075-2.5-.075s-1.685.025-2.5.075V5.5a2.5 2.5 0 115 0zM10 11a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  );
}

function LaunchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
    </svg>
  );
}

// Interactive swatch data
const swatches = [
  { name: 'Offwhite', hex: '#F5F0E8', text: 'text-ink', bg: 'bg-[#F5F0E8]', desc: 'Primary backdrop, providing a warm, tactile editorial feel.' },
  { name: 'Ink', hex: '#1A1A1A', text: 'text-offwhite', bg: 'bg-[#1A1A1A]', desc: 'Primary typography & high-contrast container surfaces.' },
  { name: 'Warm Clay', hex: '#C4956A', text: 'text-ink', bg: 'bg-[#C4956A]', desc: 'Brand accent for active states, dashboard action points, & triggers.' },
  { name: 'Muted Gold', hex: '#C9A96E', text: 'text-ink', bg: 'bg-[#C9A96E]', desc: 'Elegant highlights & sub-decorative boundaries.' },
  { name: 'Charcoal', hex: '#2C2C2C', text: 'text-offwhite', bg: 'bg-[#2C2C2C]', desc: 'High-density backing surfaces for popups & modals.' },
  { name: 'Sage', hex: '#C8D5B9', text: 'text-ink', bg: 'bg-[#C8D5B9]', desc: 'Used for system success signals and positive wallet responses.' },
  { name: 'Dusty Rose', hex: '#D4B8A8', text: 'text-ink', bg: 'bg-[#D4B8A8]', desc: 'Soft secondary backgrounds to set off system cards.' },
  { name: 'Slate Blue', hex: '#8FA3B1', text: 'text-offwhite', bg: 'bg-[#8FA3B1]', desc: 'Tactical background for metrics & advanced sections.' },
  { name: 'Pale Teal', hex: '#A8C5C0', text: 'text-ink', bg: 'bg-[#A8C5C0]', desc: 'Used for secondary actions & info signals.' },
  { name: 'Lavender Grey', hex: '#B8B2CC', text: 'text-ink', bg: 'bg-[#B8B2CC]', desc: 'Subtle container separators and tag backgrounds.' }
];

// Document sections grouping
const documentCategories = [
  {
    title: 'Brand & Vision',
    icon: <VisionIcon />,
    items: [
      { id: 'executive-summary', title: '1. Executive Summary' },
      { id: 'vision-mission', title: '2. Vision & Mission' },
      { id: 'problem-statement', title: '3. Problem Statement' },
      { id: 'market-opportunity', title: '4. Market Opportunity' },
      { id: 'user-personas', title: '5. User Personas' }
    ]
  },
  {
    title: 'Product Blueprint',
    icon: <ProductIcon />,
    items: [
      { id: 'user-journey-maps', title: '6. User Journey Maps' },
      { id: 'prd', title: '7. Product Requirements (PRD)' },
      { id: 'feature-breakdown', title: '8. Feature Breakdown' },
      { id: 'functional-requirements', title: '9. Functional Requirements' },
      { id: 'non-functional-requirements', title: '10. Non-Functional' }
    ]
  },
  {
    title: 'System & Security',
    icon: <SecurityIcon />,
    items: [
      { id: 'information-architecture', title: '11. Info Architecture' },
      { id: 'user-flows', title: '12. End-to-End User Flows' },
      { id: 'technical-architecture', title: '13. Technical Architecture' },
      { id: 'system-design', title: '14. System Component Design' },
      { id: 'data-flow-diagrams', title: '15. Data Flow Diagrams' },
      { id: 'security-architecture', title: '16. Security Architecture' },
      { id: 'threat-model', title: '17. Threat Modeling (STRIDE)' }
    ]
  },
  {
    title: 'Implementation Specs',
    icon: <TechIcon />,
    items: [
      { id: 'recovery-process-design', title: '18. Recovery Engine Design' },
      { id: 'smart-contract-requirements', title: '19. Smart Contracts (Solidity)' },
      { id: 'api-documentation', title: '20. API Endpoint Details' },
      { id: 'database-storage-structure', title: '21. Database & Walrus Schema' },
      { id: 'design-system-guidelines', title: '22. Design System & Palette' }
    ]
  },
  {
    title: 'Strategic Roadmap',
    icon: <LaunchIcon />,
    items: [
      { id: 'mvp-scope', title: '23. MVP Scope Definition' },
      { id: 'future-roadmap', title: '24. Strategic Roadmap' },
      { id: 'success-metrics', title: '25. Key Success Metrics (KPIs)' },
      { id: 'risk-assessment', title: '26. Risk Assessment Matrix' },
      { id: 'audit-requirements', title: '27. Audit Requirements' },
      { id: 'deployment-strategy', title: '28. Deployment Pipeline' },
      { id: 'launch-checklist', title: '29. Launch Checklists' }
    ]
  }
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('executive-summary');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [recoveryTab, setRecoveryTab] = useState<'cdr' | 'shamir'>('cdr');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Dynamic active section scrolling detection (scroll spy)
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 180;
      const ids = documentCategories.flatMap(c => c.items.map(i => i.id));
      
      for (const id of ids) {
        const ref = sectionRefs.current[id];
        if (ref) {
          const top = ref.offsetTop;
          const height = ref.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const ref = sectionRefs.current[id];
    if (ref) {
      window.scrollTo({
        top: ref.offsetTop - 120,
        behavior: 'smooth'
      });
      setActiveSection(id);
      setMobileDrawerOpen(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-offwhite text-ink font-body">
      {/* Visual noise backdrop */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="nythera-noise absolute inset-0 opacity-[0.035]" />
      </div>

      {/* Modern sticky navigation header */}
      <header className="sticky top-0 z-[100] border-b border-ink/[0.06] bg-offwhite/90 px-6 py-4 backdrop-blur-md md:px-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-cinzel text-[1.4rem] font-extrabold tracking-[-0.04em] text-ink hover:opacity-85 no-underline transition-opacity">
            <img
              src="/logo-dark.svg"
              alt="Nythera Logo"
              className="w-10 h-10 object-contain mr-1"
            />
            <span>
              Nyth<span className="text-warm-clay">era</span>
            </span>
          </Link>
          <span className="h-5 w-[1px] bg-ink/10 hidden sm:inline-block" />
          <span className="font-mono text-[0.65rem] tracking-[0.15em] uppercase text-ink/45 hidden md:inline-block">Documentation v1.0</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="hidden sm:inline-block font-display text-[0.82rem] font-bold px-4 py-2 bg-ink text-offwhite border border-ink tracking-[0.05em] uppercase hover:bg-transparent hover:text-ink transition-all">
            Launch App
          </Link>
          <Link href="/" className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-ink/60 hover:text-ink transition-colors whitespace-nowrap">
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Documentation Frame */}
      <div className="mx-auto flex max-w-[1400px] gap-8 px-6 py-10 md:px-16 relative">
        
        {/* LEFT COLUMN: Sticky Navigation Sidebar (Desktop) */}
        <aside className="w-[280px] shrink-0 sticky top-[95px] h-[calc(100vh-140px)] overflow-y-auto hidden lg:block pr-4 border-r border-ink/[0.04] scrollbar-thin">
          <div className="space-y-6 pb-12">
            {documentCategories.map((category) => (
              <div key={category.title} className="space-y-2">
                <div className="flex items-center gap-2 font-display text-[0.72rem] font-bold tracking-[0.15em] uppercase text-ink/35">
                  <span className="text-warm-clay">{category.icon}</span>
                  <span>{category.title}</span>
                </div>
                <ul className="list-none p-0 m-0 space-y-1">
                  {category.items.map((item) => {
                    const isActive = activeSection === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => scrollToSection(item.id)}
                          className={`w-full text-left font-body text-[0.82rem] py-1.5 px-3 rounded-lg border-none transition-all cursor-pointer ${
                            isActive 
                              ? 'bg-ink text-offwhite font-medium pl-4 shadow-sm' 
                              : 'bg-transparent text-ink/65 hover:text-ink hover:bg-ink/[0.03]'
                          }`}
                        >
                          {item.title}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        {/* RIGHT COLUMN: Interactive Document Stream */}
        <main className="flex-1 max-w-[860px] relative z-10 space-y-24">
          
          {/* Cover & Title */}
          <div className="border-b border-ink/[0.08] pb-8">
            <span className="font-mono text-[0.68rem] tracking-[0.2em] uppercase text-warm-clay font-bold bg-warm-clay/10 px-3 py-1 rounded-full">
              Full Strategy Blueprint
            </span>
            <h1 className="font-display text-[2.2rem] xs:text-[2.6rem] sm:text-[3.2rem] md:text-[4rem] font-extrabold text-ink leading-[1.05] tracking-[-0.03em] mt-4 mb-3">
              Nythera Documentation
            </h1>
            <p className="font-body text-sm font-light text-ink/55 leading-relaxed max-w-[620px]">
              Comprehensive technical, strategic, architectural, and security details for investors, developers, partners, and future team members. Grounded entirely in the Story Aeneid Testnet codebase.
            </p>
          </div>

          {/* Section 1: Executive Summary */}
          <section id="executive-summary" ref={el => { sectionRefs.current['executive-summary'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">01</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">Executive Summary</h2>
            </div>
            
            <p className="leading-relaxed text-ink/75 font-light">
              This document serves as the absolute baseline of the <strong>Nythera Protocol</strong>. Nythera provides a zero-knowledge, client-side encrypted vault that enables individuals and small teams to store seed phrases, passwords, and private files, securing them with a backup mechanism governed by decentralized on-chain rules. 
            </p>

            <div className="rounded-2xl border border-ink/[0.06] bg-white p-6 shadow-[0_12px_30px_rgba(26,26,26,0.02)] grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-display text-xs font-bold uppercase tracking-wider text-ink/35 mb-2">Core Product Concept</h4>
                <p className="text-[0.88rem] leading-relaxed text-ink/70 font-light">
                  A self-custodial digital vault allowing users to designate "Guardians" (trusted relatives, business partners, or external services). Through cryptography, guardians can recover access to the stored keys when necessary without ever gaining access to the plaintext in any other circumstance.
                </p>
              </div>
              <div className="border-t md:border-t-0 md:border-l border-ink/[0.06] pt-6 md:pt-0 md:pl-6">
                <h4 className="font-display text-xs font-bold uppercase tracking-wider text-ink/35 mb-2">Technological Core</h4>
                <p className="text-[0.88rem] leading-relaxed text-ink/70 font-light font-mono">
                  AES-256-GCM + Story Protocol Confidential Data Registry (CDR) + Threshold validator-decryption + Walrus blob integration. Zero-keys are sent to any database, ensuring a true zero-knowledge architectural pattern.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Vision & Mission */}
          <section id="vision-mission" ref={el => { sectionRefs.current['vision-mission'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">02</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">Vision & Mission</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-6 bg-dusty-rose/15 border border-dusty-rose/25 rounded-2xl">
                <span className="font-mono text-[0.62rem] uppercase tracking-widest text-dusty-rose-700 font-bold block mb-1">The Vision</span>
                <p className="font-display text-lg font-bold leading-snug text-ink">
                  "A digital estate where lost keys never translate to lost assets."
                </p>
                <p className="text-xs text-ink/60 font-light mt-3 leading-relaxed">
                  We believe that self-custody is the single most important primitive in the future of the internet, but current backups force an unsafe compromise between central convenience and user vulnerability.
                </p>
              </div>
              <div className="p-6 bg-pale-teal/15 border border-pale-teal/25 rounded-2xl">
                <span className="font-mono text-[0.62rem] uppercase tracking-widest text-teal-800 font-bold block mb-1">The Mission</span>
                <p className="font-display text-lg font-bold leading-snug text-ink">
                  "To build the gold standard of emergency key recovery tools."
                </p>
                <p className="text-xs text-ink/60 font-light mt-3 leading-relaxed">
                  Creating open-source, resilient, high-aesthetics infrastructure enabling simple, single-click recovery managed entirely on-chain by the contacts you select.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Problem Statement */}
          <section id="problem-statement" ref={el => { sectionRefs.current['problem-statement'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">03</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">Problem Statement</h2>
            </div>
            <p className="leading-relaxed text-ink/75 font-light">
              Digital asset backup is broken. Over <strong>$68B+</strong> in cryptocurrency is estimated to be lost forever because of lost seed phrases, physical degradation of paper recovery sheets, and deaths with zero succession setups. Central cloud drives are easily targeted, paper burns, and existing social recovery mechanisms are frustratingly complex and require all guardians to coordinate at the exact same moment.
            </p>
            <div className="p-5 border-l-4 border-warm-clay bg-warm-clay/5 rounded-r-xl">
              <p className="font-mono text-xs uppercase tracking-wider text-warm-clay-800 font-bold mb-1">The Single Point of Failure</p>
              <p className="text-xs text-ink/70 leading-relaxed font-light">
                In self-custody, if you lose your physical phrase sheet or hardware pin, there is no "Forgot Password" resolver. Nythera replaces this single point of failure with an immutable on-chain guardian access whitelist.
              </p>
            </div>
          </section>

          {/* Section 4: Market Opportunity */}
          <section id="market-opportunity" ref={el => { sectionRefs.current['market-opportunity'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">04</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">Market Opportunity</h2>
            </div>
            <div className="p-6 border border-dashed border-ink/20 rounded-2xl bg-white text-center">
              <span className="font-mono text-xs text-ink/40 uppercase tracking-widest block mb-2">Market & Competitive Intelligence</span>
              <span className="font-display text-sm font-bold text-ink">Coming Soon</span>
            </div>
          </section>

          {/* Section 5: User Personas */}
          <section id="user-personas" ref={el => { sectionRefs.current['user-personas'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">05</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">User Personas</h2>
            </div>
            <div className="p-6 border border-dashed border-ink/20 rounded-2xl bg-white text-center">
              <span className="font-mono text-xs text-ink/40 uppercase tracking-widest block mb-2">User Persona & Demographic Profiles</span>
              <span className="font-display text-sm font-bold text-ink">Coming Soon</span>
            </div>
          </section>



          {/* Section 6: User Journey Maps */}
          <section id="user-journey-maps" ref={el => { sectionRefs.current['user-journey-maps'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">06</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">User Journey Maps</h2>
            </div>
            
            <div className="relative border-l border-warm-clay/35 ml-4 pl-6 space-y-8 font-light text-xs">
              <div className="relative">
                <span className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-warm-clay border-2 border-offwhite" />
                <h4 className="font-display text-xs font-bold uppercase tracking-wider text-ink/75">Step 1: Auth & Secret Setup</h4>
                <p className="text-ink/60 mt-1 leading-relaxed">
                  User connects their identity using Privy email or Metamask. They select the seed phrase input grid, choosing a 12 or 24-word configuration, or upload an image file.
                </p>
              </div>
              <div className="relative">
                <span className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-warm-clay border-2 border-offwhite" />
                <h4 className="font-display text-xs font-bold uppercase tracking-wider text-ink/75">Step 2: On-Chain Whitelist Setup</h4>
                <p className="text-ink/60 mt-1 leading-relaxed">
                  The user designates their guardians. Standard wallet addresses are written on-chain, while emails are securely resolved via Privy APIs to embedded keypairs.
                </p>
              </div>
              <div className="relative">
                <span className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-warm-clay border-2 border-offwhite" />
                <h4 className="font-display text-xs font-bold uppercase tracking-wider text-ink/75">Step 3: Threshold Encryption</h4>
                <p className="text-ink/60 mt-1 leading-relaxed">
                  Client derives a 256-bit AES key. The secret is encrypted. The AES key is then threshold-encrypted against the Story global public key and sent to the CDR contract.
                </p>
              </div>
            </div>
          </section>

          {/* Section 7: PRD */}
          <section id="prd" ref={el => { sectionRefs.current['prd'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">07</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">Product Requirements (PRD)</h2>
            </div>
            <p className="leading-relaxed text-ink/75 font-light">
              This PRD establishes the core requirements for the MVP launch on the Story Aeneid network. The product must enable zero-knowledge vault creation, guardian updates on-chain, file encryption, and credit spending.
            </p>
            <div className="bg-white border border-ink/[0.06] rounded-xl p-5 space-y-3 text-xs font-light">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <strong>Target Chain:</strong> Story Aeneid Testnet (Chain ID 1315)
                </div>
                <div>
                  <strong>Auth Method:</strong> Privy (Email/Google/Wallet)
                </div>
                <div>
                  <strong>Max File Size:</strong> 4MB (Walrus aggregate ceiling)
                </div>
                <div>
                  <strong>Free Tier:</strong> 2 Free storage renewal credits per wallet
                </div>
              </div>
            </div>
          </section>

          {/* Section 8: Feature Breakdown */}
          <section id="feature-breakdown" ref={el => { sectionRefs.current['feature-breakdown'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">08</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">Feature Breakdown</h2>
            </div>
            
            <div className="overflow-x-auto rounded-xl border border-ink/[0.06] bg-white text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-ink text-offwhite font-mono uppercase tracking-wider">
                    <th className="p-3">Feature Name</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/[0.06] font-light">
                  <tr className="hover:bg-ink/[0.01]">
                    <td className="p-3 font-semibold">Vault Creation wizard</td>
                    <td className="p-3 text-emerald-700">✅ Production</td>
                    <td className="p-3 font-semibold">P0</td>
                    <td className="p-3 text-ink/70">4-Step layout defining secret parameters, contacts, safety, & signature.</td>
                  </tr>
                  <tr className="hover:bg-ink/[0.01]">
                    <td className="p-3 font-semibold">5 Vault types</td>
                    <td className="p-3 text-emerald-700">✅ Production</td>
                    <td className="p-3 font-semibold">P0</td>
                    <td className="p-3 text-ink/70">Supports Seed phrase grid, private key hex, password/PIN, text note, and files.</td>
                  </tr>
                  <tr className="hover:bg-ink/[0.01]">
                    <td className="p-3 font-semibold">On-Chain CDR write</td>
                    <td className="p-3 text-emerald-700">✅ Production</td>
                    <td className="p-3 font-semibold">P0</td>
                    <td className="p-3 text-ink/70">Authenticates, registers condition rules, and submits written payload directly.</td>
                  </tr>
                  <tr className="hover:bg-ink/[0.01]">
                    <td className="p-3 font-semibold">Walrus upload</td>
                    <td className="p-3 text-emerald-700">✅ Production</td>
                    <td className="p-3 font-semibold">P1</td>
                    <td className="p-3 text-ink/70">Encrypts files locally, submits blob requests, and logs aggregates.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 9: Functional Requirements */}
          <section id="functional-requirements" ref={el => { sectionRefs.current['functional-requirements'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">09</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">Functional Requirements</h2>
            </div>
            
            <div className="p-5 bg-white border border-ink/[0.06] rounded-xl space-y-4 text-xs font-light">
              <h4 className="font-display text-sm font-bold text-ink">Core Product Scope</h4>
              <ul className="list-disc pl-5 space-y-2 text-ink/70 leading-relaxed">
                <li>Client-side browser encryption of secret payloads prior to any outbound network transaction.</li>
                <li>AES-256-GCM encryption with NIST-compliant cryptographic IV values.</li>
                <li>Securely wipe and clean buffer variables containing temporary private key fragments.</li>
              </ul>
            </div>
          </section>

          {/* Section 10: Non-Functional Requirements */}
          <section id="non-functional-requirements" ref={el => { sectionRefs.current['non-functional-requirements'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">10</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">Non-Functional Requirements</h2>
            </div>

            <div className="p-5 bg-white border border-ink/[0.06] rounded-xl space-y-4 text-xs font-light">
              <h4 className="font-display text-sm font-bold text-ink">Non-Functional Target Metrics</h4>
              <ul className="list-disc pl-5 space-y-2 text-ink/70 leading-relaxed">
                <li><strong>Latency:</strong> Vault creation completes within 30 seconds including all on-chain signatures.</li>
                <li><strong>Security:</strong> Absolute Zero-Knowledge baseline. Clear console of key bytes on catch blocks.</li>
                <li><strong>Uptime:</strong> Web client hosts maintain 99.5% uptime. Fault logs synced with Supabase.</li>
              </ul>
            </div>
          </section>

          {/* Section 11: Information Architecture */}
          <section id="information-architecture" ref={el => { sectionRefs.current['information-architecture'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">11</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">Information Architecture</h2>
            </div>
            <p className="leading-relaxed text-ink/75 text-xs font-light">
              Nythera uses an editorial dashboard pattern designed to guide users smoothly.
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 bg-white border border-ink/[0.06] rounded-xl text-center">
                <span className="font-bold block text-warm-clay">/dashboard</span>
                <span className="text-[0.65rem] text-ink/50">List of vaults, health stats & active credits</span>
              </div>
              <div className="p-3 bg-white border border-ink/[0.06] rounded-xl text-center">
                <span className="font-bold block text-warm-clay">/vault/create</span>
                <span className="text-[0.65rem] text-ink/50">Establish a new secure encrypted vault</span>
              </div>
              <div className="p-3 bg-white border border-ink/[0.06] rounded-xl text-center">
                <span className="font-bold block text-warm-clay">/recover</span>
                <span className="text-[0.65rem] text-ink/50">Emergency single-click decrypt engine</span>
              </div>
              <div className="p-3 bg-white border border-ink/[0.06] rounded-xl text-center">
                <span className="font-bold block text-warm-clay">/wallet</span>
                <span className="text-[0.65rem] text-ink/50">Credits management and testnet key details</span>
              </div>
            </div>
          </section>

          {/* Section 12: End-to-End User Flow */}
          <section id="user-flows" ref={el => { sectionRefs.current['user-flows'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">12</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">End-to-End User Flows</h2>
            </div>
            
            <p className="text-xs text-ink/70 font-light leading-relaxed">
              During vault creation, three signatures are requested from the user, ensuring secure keyless and non-custodial operations:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white border border-ink/[0.06] rounded-xl space-y-2 relative overflow-hidden">
                <div className="absolute top-2 right-3 font-mono text-[1.5rem] font-bold text-ink/5 select-none">1</div>
                <h4 className="font-display text-sm font-bold text-ink">1. Allocate</h4>
                <p className="text-[11px] leading-relaxed text-ink/60">
                  Generates a unique vault ID on-chain, preparing consensus consensus space for metadata.
                </p>
              </div>

              <div className="p-4 bg-white border border-ink/[0.06] rounded-xl space-y-2 relative overflow-hidden">
                <div className="absolute top-2 right-3 font-mono text-[1.5rem] font-bold text-ink/5 select-none">2</div>
                <h4 className="font-display text-sm font-bold text-ink">2. Register</h4>
                <p className="text-[11px] leading-relaxed text-ink/60">
                  Maps the guardian access addresses and timelocks to the contract whitelist rules.
                </p>
              </div>

              <div className="p-4 bg-white border border-ink/[0.06] rounded-xl space-y-2 relative overflow-hidden">
                <div className="absolute top-2 right-3 font-mono text-[1.5rem] font-bold text-ink/5 select-none">3</div>
                <h4 className="font-display text-sm font-bold text-ink">3. Write</h4>
                <p className="text-[11px] leading-relaxed text-ink/60">
                  Encrypts data payload client-side and updates the CDR consensus nodes across the network.
                </p>
              </div>
            </div>
          </section>

          {/* Section 13: Technical Architecture */}
          <section id="technical-architecture" ref={el => { sectionRefs.current['technical-architecture'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">13</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">Technical Architecture</h2>
            </div>
            
            <div className="rounded-2xl border border-ink/[0.06] bg-white p-6 shadow-sm space-y-4 text-xs font-light">
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-ink/40">NextJS 16 Web Framework Dependencies</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-[0.7rem] bg-ink/[0.02] p-4 rounded-xl border border-ink/[0.04]">
                <div>
                  <strong className="text-warm-clay">NextJS:</strong> v16.2.6 (App Router)
                </div>
                <div>
                  <strong className="text-warm-clay">Privy SDK:</strong> v3.27.1
                </div>
                <div>
                  <strong className="text-warm-clay">Story CDR SDK:</strong> v0.2.1
                </div>
                <div>
                  <strong className="text-warm-clay">Shamir Core:</strong> npm/shamir-secret-sharing
                </div>
              </div>
            </div>
          </section>

          {/* Section 14: System Component Design */}
          <section id="system-design" ref={el => { sectionRefs.current['system-design'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">14</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">System Component Design</h2>
            </div>

            <div className="p-5 bg-white border border-ink/[0.06] rounded-xl space-y-3 text-xs font-light">
              <h4 className="font-display text-sm font-bold text-ink">Local-First Storage & Synchronization</h4>
              <p className="text-xs text-ink/70 leading-relaxed">
                The architecture is designed local-first. Vault metadata and tag summaries are indexed and securely cached in the browser's <code>localStorage</code>, synced asynchronously to Supabase databases, while the raw secret content is threshold-encrypted and stored on-chain.
              </p>
            </div>
          </section>

          {/* Section 16 & 17: Data Flows & Security Layer */}
          <section id="data-flow-diagrams" ref={el => { sectionRefs.current['data-flow-diagrams'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">15</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">Data Flow Diagrams</h2>
            </div>
            
            <div className="space-y-4 text-xs font-light">
              <p className="leading-relaxed text-ink/75">
                The vault lifecycle can be represented across two fundamental paths:
              </p>
              <div className="p-4 bg-ink text-offwhite font-mono rounded-xl space-y-2 text-[0.7rem]">
                <div className="text-warm-clay font-bold">// Vault Creation Data Pipeline</div>
                <div>User Input → Client AES-GCM Encrypt → Story CDR Allocate UUID → Contract Register Whitelist → On-Chain Payload Submit</div>
                <div className="mt-2 text-warm-clay font-bold">// File Attachment Pipeline (Walrus)</div>
                <div>File Payload → Client AES Encrypt (Separate Key) → Upload encrypted chunk to Walrus API → Store Blob Reference in CDR payload</div>
              </div>
            </div>
          </section>

          {/* Section 16: Security Architecture */}
          <section id="security-architecture" ref={el => { sectionRefs.current['security-architecture'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">16</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">Security Architecture</h2>
            </div>
            
            <p className="text-xs text-ink/70 font-light leading-relaxed">
              We employ a Defense-in-Depth model to secure recovery vault payloads across three distinct cryptography and access control layers:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white border border-ink/[0.06] rounded-xl space-y-2">
                <div className="font-mono text-[0.65rem] uppercase tracking-wider text-warm-clay font-bold">Layer 1: Client-Side</div>
                <h4 className="font-display text-sm font-bold text-ink">Local AES-256-GCM</h4>
                <p className="text-[11px] leading-relaxed text-ink/60">
                  Vault secrets are encrypted locally in-browser before any payload transfer. Raw mnemonic phrases and keys never leave your system.
                </p>
              </div>

              <div className="p-4 bg-white border border-ink/[0.06] rounded-xl space-y-2">
                <div className="font-mono text-[0.65rem] uppercase tracking-wider text-warm-clay font-bold">Layer 2: Protocol-Level</div>
                <h4 className="font-display text-sm font-bold text-ink">Story Validator Consensus</h4>
                <p className="text-[11px] leading-relaxed text-ink/60">
                  Consensus validators check network state rules. Encrypted secret threshold shards are distributed dynamically and safely.
                </p>
              </div>

              <div className="p-4 bg-white border border-ink/[0.06] rounded-xl space-y-2">
                <div className="font-mono text-[0.65rem] uppercase tracking-wider text-warm-clay font-bold">Layer 3: Contract-Level</div>
                <h4 className="font-display text-sm font-bold text-ink">Whitelist Conditions</h4>
                <p className="text-[11px] leading-relaxed text-ink/60">
                  Immutable smart contracts evaluate whitelist guardian authorization, enforcing time delays and cryptographic verification gates.
                </p>
              </div>
            </div>
          </section>

          {/* Section 17: Threat Model (STRIDE) */}
          <section id="threat-model" ref={el => { sectionRefs.current['threat-model'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">17</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">Threat Modeling (STRIDE)</h2>
            </div>
            
            <div className="overflow-x-auto rounded-xl border border-ink/[0.06] bg-white text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-ink text-offwhite font-mono uppercase tracking-wider">
                    <th className="p-3">Threat Category</th>
                    <th className="p-3">Risk Scenario</th>
                    <th className="p-3">Nythera Mitigations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/[0.06] font-light">
                  <tr className="hover:bg-ink/[0.01]">
                    <td className="p-3 font-semibold">Spoofing Identity</td>
                    <td className="p-3 text-ink/70">Attacker pretends to be an authorized guardian</td>
                    <td className="p-3 text-emerald-800 font-semibold">On-chain whitelist query. Guardian signature required.</td>
                  </tr>
                  <tr className="hover:bg-ink/[0.01]">
                    <td className="p-3 font-semibold">Tampering with Data</td>
                    <td className="p-3 text-ink/70">Malicious node alters the stored ciphertext</td>
                    <td className="p-3 text-emerald-800 font-semibold">AES-GCM authentication tags fail immediately if modified.</td>
                  </tr>
                  <tr className="hover:bg-ink/[0.01]">
                    <td className="p-3 font-semibold">Information Disclosure</td>
                    <td className="p-3 text-ink/70">Supabase DB is hacked or database compromised</td>
                    <td className="p-3 text-emerald-800 font-semibold">DB holds no secrets or keys — metadata only.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 18: Recovery Engine Design (Interactive) */}
          <section id="recovery-process-design" ref={el => { sectionRefs.current['recovery-process-design'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">18</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">Recovery Engine Design</h2>
            </div>
            <p className="leading-relaxed text-ink/75 font-light">
              Toggle the different recovery paths below to inspect the architectural differences:
            </p>

            <div className="flex gap-2 border-b border-ink/10 pb-px">
              {(['cdr', 'shamir'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRecoveryTab(tab)}
                  className={`px-4 py-2 font-mono text-[0.72rem] uppercase tracking-wider border-none transition-all cursor-pointer rounded-t-lg ${
                    recoveryTab === tab 
                      ? 'bg-ink text-offwhite font-bold' 
                      : 'bg-transparent text-ink/50 hover:bg-ink/5'
                  }`}
                >
                  {tab === 'cdr' ? 'CDR Primary' : 'Local Shamir'}
                </button>
              ))}
            </div>

            <div className="bg-white border border-ink/[0.06] rounded-xl p-5 text-xs leading-relaxed font-light">
              {recoveryTab === 'cdr' && (
                <div className="space-y-2">
                  <h4 className="font-display text-xs font-bold text-ink">Path A: On-Chain CDR Threshold Decrypt</h4>
                  <p className="text-ink/65">
                    Primary production flow. The guardian connects their address, triggering the <code>WhitelistCondition</code> contract. Once validated, the Story network consensus validators threshold-decrypt the metadata keys, outputting the secret to the client-side state.
                  </p>
                  <span className="font-mono text-[0.62rem] text-warm-clay uppercase tracking-wider block bg-warm-clay/5 p-2 rounded">
                    Security: High · Gas Fees: Yes (writeFee/accessFee) · Offline Support: No
                  </span>
                </div>
              )}
              {recoveryTab === 'shamir' && (
                <div className="space-y-2">
                  <h4 className="font-display text-xs font-bold text-ink">Path B: Local Shamir Key Combination</h4>
                  <p className="text-ink/65">
                    The raw AES key is split using Shamir's Secret Sharing. Guardians receive raw key shards (via copy-paste). Once the owner requests recovery, they must collect at least the threshold number of shares and paste them together inside the browser.
                  </p>
                  <span className="font-mono text-[0.62rem] text-warm-clay uppercase tracking-wider block bg-warm-clay/5 p-2 rounded">
                    Security: Moderate (manual shard custody) · Gas Fees: No · Offline Support: Yes
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Section 19: Smart Contract Requirements */}
          <section id="smart-contract-requirements" ref={el => { sectionRefs.current['smart-contract-requirements'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">19</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">Smart Contract Requirements</h2>
            </div>
            
            <div className="space-y-4 text-xs font-light">
              <p>Nythera relies on three distinct contract standards deployed on Story Testnet:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
                <div className="p-4 bg-white border border-ink/[0.06] rounded-xl space-y-2">
                  <span className="font-bold text-warm-clay block">WhitelistCondition.sol</span>
                  <span className="text-[0.65rem] text-ink/50 leading-relaxed block">
                    V1 implementation. Simple creator-managed whitelist array mapping vault UUIDs to permitted addresses.
                  </span>
                </div>
                <div className="p-4 bg-white border border-ink/[0.06] rounded-xl space-y-2">
                  <span className="font-bold text-warm-clay block">AccessConditionV2.sol</span>
                  <span className="text-[0.65rem] text-ink/50 leading-relaxed block">
                    V2 implementation. Encodes list constraints at allocation rather than holding state directly, optimizing gas fees.
                  </span>
                </div>
                <div className="p-4 bg-white border border-ink/[0.06] rounded-xl space-y-2">
                  <span className="font-bold text-warm-clay block">AccessConditionV3.sol</span>
                  <span className="text-[0.65rem] text-ink/50 leading-relaxed block">
                    V3 implementation. Resolves <code>tx.origin</code> caller addresses during complex cross-contract validator operations.
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 20: API Documentation Structure */}
          <section id="api-documentation" ref={el => { sectionRefs.current['api-documentation'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">20</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">API Documentation</h2>
            </div>
            
            <div className="space-y-4">
              <div className="rounded-xl border border-ink/[0.06] bg-white p-4 space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-700 text-offwhite px-2 py-0.5 rounded text-[0.62rem]">POST</span>
                  <span className="font-bold">/api/vault-records</span>
                </div>
                <p className="text-[0.72rem] text-ink/60 font-body font-light">Submits a new metadata record representing a generated vault to Supabase.</p>
                <div className="bg-ink text-offwhite p-3 rounded text-[0.68rem] leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
                  <span className="text-muted-gold font-bold">// Request Payload JSON</span><br/>
                  {'{ "wallet": "0x...", "vault": { "id": "uuid", "vault_name": "backup", ... } }'}
                </div>
              </div>

              <div className="rounded-xl border border-ink/[0.06] bg-white p-4 space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="bg-sky-700 text-offwhite px-2 py-0.5 rounded text-[0.62rem]">GET</span>
                  <span className="font-bold">/api/vault-records?wallet=0x...</span>
                </div>
                <p className="text-[0.72rem] text-ink/60 font-body font-light">Fetches all active vaults associated with or whitelisting the provided wallet.</p>
              </div>

              <div className="rounded-xl border border-ink/[0.06] bg-white p-4 space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-600 text-offwhite px-2 py-0.5 rounded text-[0.62rem]">POST</span>
                  <span className="font-bold">/api/storage/walrus/upload</span>
                </div>
                <p className="text-[0.72rem] text-ink/60 font-body font-light">Uploads encrypted asset blobs directly to the Walrus network aggregation nodes.</p>
              </div>
            </div>
          </section>

          {/* Section 21: Database & Storage Structure */}
          <section id="database-storage-structure" ref={el => { sectionRefs.current['database-storage-structure'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">21</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">Database & Walrus Schema</h2>
            </div>
            
            <div className="rounded-2xl border border-ink/[0.06] bg-white p-6 shadow-sm space-y-4 text-xs font-light">
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-ink/40">Supabase DB Tables</h4>
              <div className="space-y-3">
                <div>
                  <strong className="font-mono text-warm-clay">1. user_storage_accounts</strong>
                  <p className="text-ink/60 mt-0.5 font-sans">Tracks user wallets, synced emails, and remaining storage credits balance (default: 2 free).</p>
                </div>
                <div className="border-t border-ink/[0.06] pt-3">
                  <strong className="font-mono text-warm-clay">2. vault_records</strong>
                  <p className="text-ink/60 mt-0.5 font-sans">Holds public metadata: tags, categorizations, end dates, and Walrus blob IDs. Holds no keys or secrets.</p>
                </div>
                <div className="border-t border-ink/[0.06] pt-3">
                  <strong className="font-mono text-warm-clay">3. vault_recipients</strong>
                  <p className="text-ink/60 mt-0.5 font-sans">Details the whitelisted contacts mapping to specific vaults for easier invite status checking.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 22: Design System Guidelines */}
          <section id="design-system-guidelines" ref={el => { sectionRefs.current['design-system-guidelines'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">22</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">Design System & Palette</h2>
            </div>
            
            <p className="leading-relaxed text-ink/75 font-light text-xs">
              The Nythera design language is built on an editorial, tactile, high-contrast aesthetic that combines warm vintage tones with clean cryptographic layout grids. Below are the color swatches, typography rules, component classes, and interactive previews.
            </p>

            {/* Sub-section: Palette */}
            <div className="space-y-3">
              <h4 className="font-display text-[0.68rem] font-bold uppercase tracking-wider text-ink/50">Color Palette Swatches</h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {swatches.map((color) => (
                  <div 
                    key={color.name} 
                    className="rounded-xl border border-ink/[0.08] bg-white p-2 text-center group cursor-pointer hover:shadow-md transition-all duration-200"
                  >
                    <div className={`w-full h-12 rounded-lg ${color.bg} border border-ink/5 mb-2 flex items-center justify-center`}>
                      <span className={`font-mono text-[0.62rem] ${color.text} opacity-0 group-hover:opacity-100 transition-opacity font-bold`}>
                        {color.hex}
                      </span>
                    </div>
                    <span className="font-display text-xs font-bold block text-ink">{color.name}</span>
                    <span className="text-[0.58rem] text-ink/50 leading-tight block mt-1 font-light min-h-[36px]">{color.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Typography */}
              <div className="p-5 bg-white border border-ink/[0.06] rounded-xl space-y-4">
                <h4 className="font-display text-[0.68rem] font-bold uppercase tracking-wider text-ink/50">Typography Specifications</h4>
                <div className="space-y-3 text-xs leading-relaxed font-light">
                  <div className="pb-3 border-b border-ink/5">
                    <span className="ny-label text-[9px] block mb-1">Display Font (--font-display)</span>
                    <span className="font-display text-2xl font-bold block text-ink">Bricolage Grotesque</span>
                    <span className="text-ink/60 block mt-1 text-[11px]">Used for high-impact headlines, vault titles, and brand markers. Characterized by tight tracking.</span>
                  </div>
                  <div className="pb-3 border-b border-ink/5">
                    <span className="ny-label text-[9px] block mb-1">Body Font (--font-body)</span>
                    <span className="font-sans font-medium block text-ink">Poppins / Inter</span>
                    <span className="text-ink/60 block mt-1 text-[11px]">Used for copy details, system summaries, description items, and forms. Optimized for high readability.</span>
                  </div>
                  <div>
                    <span className="ny-label text-[9px] block mb-1">Monospace Font (--font-mono)</span>
                    <span className="font-mono font-medium block text-ink text-[11px]">JetBrains Mono</span>
                    <span className="text-ink/60 block mt-1 text-[11px]">Used for addresses, transaction hashes, numbers, tags, and all system parameters.</span>
                  </div>
                </div>
              </div>

              {/* Utility Classes */}
              <div className="p-5 bg-white border border-ink/[0.06] rounded-xl space-y-4">
                <h4 className="font-display text-[0.68rem] font-bold uppercase tracking-wider text-ink/50">CSS Component Classes</h4>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-4 py-1 border-b border-ink/5">
                    <code className="font-bold text-ink">.ny-panel</code>
                    <span className="text-ink/60 font-light text-[10px] font-sans">Glassmorphic panel (shadow & gold top line)</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-4 py-1 border-b border-ink/5">
                    <code className="font-bold text-ink">.ny-tile</code>
                    <span className="text-ink/60 font-light text-[10px] font-sans">Lighter nested glass cell (for metric groups)</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-4 py-1 border-b border-ink/5">
                    <code className="font-bold text-ink">.ny-modal</code>
                    <span className="text-ink/60 font-light text-[10px] font-sans">Opaque popup context card (heavy backing shadow)</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-4 py-1 border-b border-ink/5">
                    <code className="font-bold text-ink">.ny-label</code>
                    <span className="text-ink/60 font-light text-[10px] font-sans">Monospace uppercase micro labels (letter-spacing 0.16em)</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-4 py-1 border-b border-ink/5">
                    <code className="font-bold text-ink">.ny-divider</code>
                    <span className="text-ink/60 font-light text-[10px] font-sans">Fade-out horizontal separator lines</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-4 py-1">
                    <code className="font-bold text-ink">.ny-success-mark</code>
                    <span className="text-ink/60 font-light text-[10px] font-sans">Success animations with expandable ring checks</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Components Playground */}
            <div className="p-6 bg-white border border-ink/[0.06] rounded-xl space-y-4">
              <h4 className="font-display text-[0.68rem] font-bold uppercase tracking-wider text-ink/50">Interactive Component Previews</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="ny-label text-[9px] block">Form Inputs (.ny-input)</span>
                    <input 
                      type="text" 
                      placeholder="Interactive design input..." 
                      className="ny-input px-3 py-2 text-xs"
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="ny-label text-[9px] block">Badge Pills (.ny-pill)</span>
                    <div className="flex gap-2 flex-wrap">
                      <span className="ny-pill">Personal</span>
                      <span className="ny-pill">Family</span>
                      <span className="ny-pill">Story Testnet</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="ny-label text-[9px] block">Action Buttons (.ny-button)</span>
                  <div className="flex gap-3 flex-wrap">
                    <button className="ny-button px-4 py-2 font-mono text-[0.68rem] tracking-wider uppercase font-bold">
                      Primary
                    </button>
                    <button className="ny-button-secondary px-4 py-2 font-mono text-[0.68rem] tracking-wider uppercase font-bold">
                      Secondary
                    </button>
                    <button className="ny-button-danger px-4 py-2 font-mono text-[0.68rem] tracking-wider uppercase font-bold">
                      Danger
                    </button>
                  </div>
                  <p className="text-[0.62rem] text-ink/50 leading-relaxed font-light mt-3">
                    Note: The components above are live instances. Hover over them to see the interactive lift, color swaps, and outline adjustments defined in the Nythera stylesheet.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 23: MVP Scope */}
          <section id="mvp-scope" ref={el => { sectionRefs.current['mvp-scope'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">23</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">MVP Scope Definition</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-light">
              <div className="p-5 bg-white border border-ink/[0.06] rounded-xl space-y-2">
                <span className="font-display text-xs font-bold text-emerald-800 block">In Scope for MVP Launch</span>
                <ul className="list-disc pl-5 space-y-1 text-ink/75">
                  <li>Privy Embedded Wallet authentication</li>
                  <li>AES client-side encryption flows</li>
                  <li>CDR registry writes and whitelist conditions</li>
                  <li>Walrus secure image/pdf storage integration</li>
                  <li>Dynamic storage credit grants (2 free)</li>
                </ul>
              </div>
              <div className="p-5 bg-white border border-ink/[0.06] rounded-xl space-y-2">
                <span className="font-display text-xs font-bold text-red-800 block">Out of Scope (Post-Launch)</span>
                <ul className="list-disc pl-5 space-y-1 text-ink/75">
                  <li>Timelock access delays (contract timelock rules)</li>
                  <li>Biometric authentication constraints</li>
                  <li>Multi-chain registry support (Polygon/Base)</li>
                  <li>Dead-man's switch automation</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 24: Strategic Roadmap */}
          <section id="future-roadmap" ref={el => { sectionRefs.current['future-roadmap'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">24</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">Strategic Roadmap</h2>
            </div>
            <div className="p-6 border border-dashed border-ink/20 rounded-2xl bg-white text-center">
              <span className="font-mono text-xs text-ink/40 uppercase tracking-widest block mb-2">Detailed Strategic Milestones</span>
              <span className="font-display text-sm font-bold text-ink">Coming Soon</span>
            </div>
          </section>

          {/* Section 25: Key Success Metrics */}
          <section id="success-metrics" ref={el => { sectionRefs.current['success-metrics'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">25</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">Key Success Metrics</h2>
            </div>
            <div className="p-6 border border-dashed border-ink/20 rounded-2xl bg-white text-center">
              <span className="font-mono text-xs text-ink/40 uppercase tracking-widest block mb-2">KPIs & Platform Analytics</span>
              <span className="font-display text-sm font-bold text-ink">Coming Soon</span>
            </div>
          </section>

          {/* Section 26: Risk Assessment Matrix */}
          <section id="risk-assessment" ref={el => { sectionRefs.current['risk-assessment'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">26</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">Risk Assessment Matrix</h2>
            </div>
            <div className="p-6 border border-dashed border-ink/20 rounded-2xl bg-white text-center">
              <span className="font-mono text-xs text-ink/40 uppercase tracking-widest block mb-2">Formal Risk & Vulnerability Metrics</span>
              <span className="font-display text-sm font-bold text-ink">Coming Soon</span>
            </div>
          </section>

          {/* Section 27: Audit Requirements */}
          <section id="audit-requirements" ref={el => { sectionRefs.current['audit-requirements'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">27</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">Audit Requirements</h2>
            </div>
            
            <div className="p-5 bg-white border border-ink/[0.06] rounded-xl space-y-4 text-xs font-light">
              <h4 className="font-display text-sm font-bold text-ink">Critical Audits Scheduled</h4>
              <ul className="list-disc pl-5 space-y-2 text-ink/70 leading-relaxed">
                <li><strong>Contracts Audit:</strong> Complete validation of AccessCondition logic, reentrancy paths, gas limits, and creator bypass.</li>
                <li><strong>Crypto Review:</strong> Strict review of AES key zeroing and generator functions in the Web Crypto scopes.</li>
              </ul>
            </div>
          </section>

          {/* Section 28: Deployment Pipeline */}
          <section id="deployment-strategy" ref={el => { sectionRefs.current['deployment-strategy'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">28</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">Deployment Pipeline</h2>
            </div>

            <div className="p-5 bg-white border border-ink/[0.06] rounded-xl space-y-3 text-xs font-light">
              <h4 className="font-display text-sm font-bold text-ink">Deployment Configurations</h4>
              <p className="text-ink/65 leading-relaxed">
                Web frontend is compiled and hosted on <strong>Vercel</strong> edge routing nodes. Synced database configurations run securely on <strong>Supabase</strong> PostgreSQL instances guarded by strict Row Level Security (RLS) rules matching specific wallet structures.
              </p>
            </div>
          </section>

          {/* Section 29: Interactive Launch Checklist */}
          <section id="launch-checklist" ref={el => { sectionRefs.current['launch-checklist'] = el; }} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-warm-clay border border-warm-clay/30 px-2 py-0.5 rounded">29</span>
              <h2 className="font-display text-3xl font-bold tracking-tight">Launch Checklist</h2>
            </div>
            <p className="leading-relaxed text-ink/75 font-light">
              Review our live target checklist before migrating from the current testnet phase:
            </p>

            <div className="space-y-3 font-light text-xs">
              <label className="flex items-center gap-3 p-3 bg-white border border-ink/[0.04] rounded-lg cursor-pointer hover:bg-ink/[0.01]">
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-warm-clay" />
                <span className="line-through text-ink/45">Setup Privy embedded login flows on Story Aeneid network.</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-white border border-ink/[0.04] rounded-lg cursor-pointer hover:bg-ink/[0.01]">
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-warm-clay" />
                <span className="line-through text-ink/45">Implement responsive layouts and custom mobile sidebar drawers.</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-white border border-ink/[0.04] rounded-lg cursor-pointer hover:bg-ink/[0.01]">
                <input type="checkbox" className="w-4 h-4 accent-warm-clay" />
                <span>Perform formal third-party contract audits pre-mainnet.</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-white border border-ink/[0.04] rounded-lg cursor-pointer hover:bg-ink/[0.01]">
                <input type="checkbox" className="w-4 h-4 accent-warm-clay" />
                <span>Hardcode secure production Supabase Row Level Security (RLS) filters.</span>
              </label>
            </div>
          </section>

          {/* Table of Contents Appendix */}
          <div className="border-t border-ink/[0.08] pt-12 text-center">
            <p className="font-mono text-[0.65rem] tracking-[0.15em] uppercase text-ink/45">
              End of Nythera Project Blueprint.
            </p>
            <p className="font-body text-xs text-ink/35 font-light mt-1.5 leading-relaxed">
              For security notifications, partnerships, or developer queries, visit the GitHub or reach out to the core engineering team.
            </p>
          </div>

        </main>
      </div>

      {/* MOBILE FLOATING TABLE OF CONTENTS (TOC) DRAWER */}
      <div className="lg:hidden fixed bottom-6 right-6 z-[200]">
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-ink text-offwhite border-none shadow-xl cursor-pointer transition-transform hover:scale-105"
          aria-label="Table of contents"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Collapsible Mobile Drawer Overlay */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[1000] bg-ink/40 backdrop-blur-sm flex justify-end">
          <div className="w-[300px] max-w-full bg-offwhite h-full p-6 shadow-2xl overflow-y-auto flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-ink/5 pb-4">
                <span className="font-display text-sm font-bold uppercase tracking-wider text-ink/50">Outline</span>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="bg-transparent border-none text-ink cursor-pointer w-8 h-8 flex items-center justify-center"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
              <div className="space-y-6">
                {documentCategories.map((category) => (
                  <div key={category.title} className="space-y-2">
                    <div className="font-display text-[0.68rem] font-bold tracking-[0.12em] uppercase text-ink/35">
                      {category.title}
                    </div>
                    <ul className="list-none p-0 m-0 space-y-1">
                      {category.items.map((item) => (
                        <li key={item.id}>
                          <button
                            onClick={() => scrollToSection(item.id)}
                            className="w-full text-left font-body text-[0.8rem] py-1 bg-transparent text-ink/75 hover:text-ink cursor-pointer border-none"
                          >
                            {item.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-ink/5 pt-6 mt-6">
              <Link href="/dashboard" className="w-full text-center block font-display text-[0.82rem] font-bold px-4 py-2.5 bg-ink text-offwhite border border-ink tracking-[0.05em] uppercase hover:bg-transparent hover:text-ink transition-all">
                Launch App
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
