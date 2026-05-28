'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, type Variants } from 'framer-motion';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const navLinks = ['How It Works', 'Security', 'FAQ'];

const steps = [
  ['Step 1:', 'Save the important secret', 'Add a seed phrase, private key, password, note or file. Nythera encrypts it in your browser.'],
  ['Step 2:', 'Name trusted people', 'Choose the family members, friends or teammates who should be able to help in an emergency.'],
  ['Step 3:', 'Lock in recovery access', 'Your wallet confirms who is allowed to open the vault later.'],
  ['Step 4:', 'Recover when needed', 'An approved person connects their wallet and opens the encrypted vault when it matters.'],
];

const securityPoints = [
  'Secrets are encrypted before they leave your browser',
  'Nythera never saves plaintext recovery data',
  'Trusted contacts must be approved before recovery',
  'Vault names, descriptions, and tags make backups easy to identify',
  'Recovery history helps you see when a vault was opened',
  'Advanced blockchain details stay available when support needs them',
];

const faqs = [
  ['Does Nythera store my seed phrase?', 'No. Vault contents are encrypted client-side before being stored or uploaded. The app stores vault metadata, not plaintext secrets.'],
  ['Who can recover a vault?', 'Only the owner wallet and trusted contacts you approve can recover a vault.'],
  ['Can I use email guardians?', 'Yes. Email contacts can be resolved to wallet-linked recipients where supported, making recovery easier for less technical guardians.'],
  ['Can I change trusted contacts later?', 'Yes. You can add, remove, or replace recovery contacts after a vault is created.'],
  ['What can I store?', 'You can store text secrets like seed phrases or recovery instructions, and encrypted files backed by Walrus storage.'],
  ['Is recovery counted?', 'Yes. Successful recoveries are recorded in the vault\'s local recovery history so you can see how many times a vault has been recovered.'],
];

const footerColumns = {
  protocol: [
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'Security', href: '/#security' },
    { label: 'Trusted Contacts', href: '/#security' },
  ],
  product: [
    { label: 'Web App', href: '/dashboard' },
  ],
};

const footerMarquee = [
  'Decentralised Recovery',
  'CDR Encrypted',
  'No Single Point of Failure',
  'Guardian Protocol',
  'On-Chain Proof',
  'Threshold Secret Sharing',
  'Your Keys. Always.',
];

type NavTone = 'offwhite' | 'rose' | 'slate' | 'clay' | 'teal' | 'dark';

const navToneClass: Record<NavTone, string> = {
  offwhite: 'bg-offwhite/85 text-ink',
  rose: 'bg-dusty-rose/85 text-ink',
  slate: 'bg-slate-blue/85 text-ink',
  clay: 'bg-warm-clay/82 text-ink',
  teal: 'bg-pale-teal/85 text-ink',
  dark: 'bg-charcoal/92 text-offwhite',
};

export default function Home() {
  const [navTone, setNavTone] = useState<NavTone>('offwhite');

  useEffect(() => {
    const updateTone = () => {
      const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-nav-tone]'));
      const sampleY = window.innerHeight * 0.28;
      const active = sections.findLast((section) => section.getBoundingClientRect().top <= sampleY);
      setNavTone((active?.dataset.navTone as NavTone | undefined) ?? 'offwhite');
    };

    updateTone();
    window.addEventListener('scroll', updateTone, { passive: true });
    window.addEventListener('resize', updateTone);
    return () => {
      window.removeEventListener('scroll', updateTone);
      window.removeEventListener('resize', updateTone);
    };
  }, []);

  useEffect(() => {
    const reveals = Array.from(document.querySelectorAll<HTMLElement>('.landing-reveal'));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -50px 0px' },
    );

    reveals.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-offwhite text-ink">
      <AmbientBackground />
      <Navbar tone={navTone} />
      <div className="relative z-10">
        <HeroSection />
        <HowItWorksSection />
      </div>
      <SecuritySection />
      <FaqSection />
      <Footer />
    </main>
  );
}

function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <div className="nythera-noise absolute inset-0 opacity-[0.05]" />
    </div>
  );
}

function Navbar({ tone }: { tone: NavTone }) {
  const dark = tone === 'dark';
  return (
    <header className={`fixed left-0 right-0 top-0 z-50 px-5 py-4 transition-colors duration-500 md:px-16 ${navToneClass[tone]} backdrop-blur-2xl`}>
      <nav className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="group flex items-center">
          <span className="font-cinzel text-[1.35rem] font-extrabold tracking-[-0.03em]">
            Nythera
          </span>
        </Link>
        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <a key={link} href={`#${slug(link)}`} className={`font-display text-[0.9rem] font-medium transition hover:opacity-100 ${dark ? 'text-offwhite/72' : 'text-ink/70'}`}>
              {link}
            </a>
          ))}
        </div>
        <Link href="/dashboard" className={`ml-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 font-display text-[0.72rem] font-semibold uppercase tracking-[0.06em] transition-all duration-300 hover:-translate-y-0.5 ${dark ? 'border border-muted-gold/70 bg-muted-gold/95 text-ink shadow-[0_8px_18px_rgba(201,169,110,0.28)] hover:bg-muted-gold' : 'border border-ink/15 bg-ink text-offwhite shadow-[0_10px_20px_rgba(26,26,26,0.16)] hover:border-warm-clay/60 hover:bg-warm-clay hover:text-ink'}`}>
          <span>Launch App</span>
          <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white/10">
            <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden="true">
              <path d="M4.5 11.5L11.5 4.5M6 4.5H11.5V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </Link>
      </nav>
    </header>
  );
}

function HeroSection() {
  return (
    <section data-nav-tone="offwhite" className="landing-hero-grid relative z-10 min-h-screen overflow-hidden bg-offwhite px-6 pb-24 pt-32 md:px-16 md:pb-28 md:pt-36" id="hero">
      <div className="grain-overlay" />

      {/* Ambient rune glow behind content */}
      <div className="hero-rune-glow pointer-events-none absolute left-[20%] top-[30%] -translate-x-1/2 -translate-y-1/2 h-[520px] w-[520px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(196,149,106,0.12) 0%, rgba(201,169,110,0.06) 40%, transparent 70%)' }} />

      <motion.div variants={stagger} initial="hidden" animate="show" className="relative mx-auto grid w-full min-h-[calc(100vh-9rem)] max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
        {/* â”€â”€ Left Column: Copy â”€â”€ */}
        <div className="relative z-20 min-w-0 max-w-[760px] text-left">


          {/* Main Headline */}
          <motion.h1 variants={fadeUp} className="max-w-[14ch] font-display text-[34px] sm:text-[46px] md:text-[54px] lg:text-[60px] font-bold leading-[0.98] tracking-[-0.03em] text-ink">
            <span className="block">
              The decentralized vault for <span className="text-[#c4956a]">your secrets</span>
            </span>

          </motion.h1>

          {/* Subtitle */}
          <motion.p variants={fadeUp} className="mt-6 max-w-[56ch] font-body text-base font-light leading-7 text-ink/55 sm:text-lg md:text-xl">
            Encrypt seed phrases, private keys, passwords and sensitive files on-chain with secure recovery infrastructure built for self-custody.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="mt-10 flex flex-wrap gap-3">
            <Link href="/vault/create" className="inline-flex items-center gap-1.5 border border-ink/15 bg-ink px-4 py-1.5 font-display text-[0.74rem] font-semibold tracking-[0.04em] text-offwhite transition-all duration-300 hover:-translate-y-0.5 hover:border-warm-clay/60 hover:bg-warm-clay hover:text-ink">
              <span>Create a Vault</span>
            </Link>
          </motion.div>


        </div>

        {/* ── Right Column: Vault Visual ── */}
        <motion.div variants={fadeUp} className="relative z-10 w-full">
          <div className="relative mx-auto w-full max-w-[620px]">
            <HeroVaultVisual />
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <div className="pointer-events-none absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-ink/25 lg:flex">
        <span>Scroll</span>
        <motion.span
          className="h-10 w-px bg-ink/18"
          animate={{ scaleY: [0.4, 1, 0.4], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </section>
  );
}

function HeroVaultVisual() {
  const guardians = [
    { label: 'Family', angle: 30, color: 'bg-pale-teal' },
    { label: 'Attorney', angle: 150, color: 'bg-muted-gold' },
    { label: 'Backup', angle: 270, color: 'bg-warm-clay' },
  ];

  /* Ambient particles â€” golden dots that drift upward */
  const particles = Array.from({ length: 8 }, (_, i) => ({
    left: `${15 + (i * 11) % 70}%`,
    delay: `${i * 0.7}s`,
    duration: `${3 + (i % 3) * 1.2}s`,
    size: i % 3 === 0 ? 3 : 2,
  }));

  return (
    <div className="relative mx-auto w-full max-w-[560px] aspect-square">

      {/* ── Ambient Particles ── */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-muted-gold/60 z-10"
          style={{
            width: p.size,
            height: p.size,
            left: p.left,
            bottom: '20%',
            animation: `particleDrift ${p.duration} ease-in-out ${p.delay} infinite`,
          }}
        />
      ))}

      {/* ── Vault Core ── */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        {/* Outer glow ring */}
        <div className="absolute -inset-8 rounded-full border border-muted-gold/10 hero-rune-glow" />

        {/* Core */}
        <div className="hero-vault-core relative grid h-[88px] w-[88px] place-items-center border-2 border-muted-gold/50 bg-offwhite shadow-[0_0_40px_rgba(201,169,110,0.18)]">
          <div className="text-center">
            <span className="block font-display text-[0.7rem] font-bold uppercase tracking-[0.1em] text-ink/70">Vault</span>
          </div>
          {/* Corner accents */}
          <span className="absolute -left-1 -top-1 h-3 w-3 border-l-2 border-t-2 border-muted-gold/40" />
          <span className="absolute -right-1 -top-1 h-3 w-3 border-r-2 border-t-2 border-muted-gold/40" />
          <span className="absolute -bottom-1 -left-1 h-3 w-3 border-b-2 border-l-2 border-muted-gold/40" />
          <span className="absolute -bottom-1 -right-1 h-3 w-3 border-b-2 border-r-2 border-muted-gold/40" />
        </div>
      </div>

      {/* ── Orbit Ring 1 (innermost) ── */}
      <div
        className="hero-orbit absolute left-1/2 top-1/2 rounded-full border border-dashed border-ink/[0.08]"
        style={{ width: '52%', height: '52%', '--orbit-duration': '30s' } as React.CSSProperties}
      >
        <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-pale-teal/60 shadow-[0_0_8px_rgba(168,197,192,0.4)]" />
      </div>

      {/* ── Orbit Ring 2 (middle) ── */}
      <div
        className="hero-orbit-reverse absolute left-1/2 top-1/2 rounded-full border border-ink/[0.06]"
        style={{ width: '72%', height: '72%', '--orbit-duration': '22s' } as React.CSSProperties}
      >
        <span className="absolute -right-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-muted-gold/50 shadow-[0_0_10px_rgba(201,169,110,0.4)]" />
        <span className="absolute -left-1 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-warm-clay/40" />
      </div>

      {/* ── Orbit Ring 3 (outermost) ── */}
      <div
        className="hero-orbit absolute left-1/2 top-1/2 rounded-full border border-dashed border-ink/[0.05]"
        style={{ width: '90%', height: '90%', '--orbit-duration': '35s' } as React.CSSProperties}
      >
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-lavender-grey/50 shadow-[0_0_8px_rgba(184,178,204,0.3)]" />
      </div>

      {/* ── Guardian Nodes ── */}
      {guardians.map((g) => {
        const rad = (g.angle * Math.PI) / 180;
        const radius = 42;
        const x = 50 + radius * Math.cos(rad);
        const y = 50 + radius * Math.sin(rad);
        return (
          <div
            key={g.label}
            className="absolute z-10 flex flex-col items-center gap-1.5 transition-transform duration-500 hover:scale-110"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="flex min-w-[80px] flex-col items-center border border-ink/[0.08] bg-offwhite/80 px-3 py-2 text-center backdrop-blur-sm shadow-[0_8px_20px_rgba(26,26,26,0.04)]">
              <span className={`h-1.5 w-1.5 rounded-full ${g.color}`} />
              <span className="mt-1.5 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-ink/45">{g.label}</span>
            </div>
          </div>
        );
      })}

      {/* ── Data flow lines (SVG) ── */}
      <svg className="absolute inset-0 w-full h-full z-[5] pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {guardians.map((g) => {
          const rad = (g.angle * Math.PI) / 180;
          const radius = 42;
          const x = 50 + radius * Math.cos(rad);
          const y = 50 + radius * Math.sin(rad);
          return (
            <line
              key={g.label}
              x1="50" y1="50"
              x2={x} y2={y}
              stroke="rgba(201,169,110,0.12)"
              strokeWidth="0.3"
              strokeDasharray="2 2"
              style={{ animation: 'dataFlowDash 1.5s linear infinite' }}
            />
          );
        })}
      </svg>

      {/* Cross-hairs */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-ink/[0.05] to-transparent" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-gradient-to-b from-transparent via-ink/[0.05] to-transparent" />

    </div>
  );
}

function HowItWorksSection() {
  return (
    <CinematicSection
      id="how-it-works"
      navTone="rose"
      toneClass="bg-dusty-rose"
      eyebrow="How it works"
      title="Backup Plan In Four Steps"
      titleClassName="font-body"
    >
      <div className="relative grid gap-8 lg:grid-cols-4 lg:gap-0 before:absolute before:left-[10%] before:right-[10%] before:top-10 before:hidden before:h-px before:bg-ink/15 lg:before:block">
        {steps.map(([step, title, body], index) => (
          <motion.div
            key={title}
            variants={fadeUp}
            className={`group landing-reveal landing-reveal-delay-${Math.min(index, 3)} relative px-6 text-center`}
          >
            <span className="relative z-10 mx-auto grid h-20 w-20 place-items-center border border-ink/20 bg-white/50 font-mono text-xs text-ink backdrop-blur-sm transition duration-300 group-hover:scale-105">{String(index + 1).padStart(2, '0')}</span>
            <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/45">{step}</p>
            <h3 className="mt-3 text-base font-bold text-ink">{title}</h3>
            <p className="mt-3 text-sm font-light leading-7 text-[#4a3a35]">{body}</p>
          </motion.div>
        ))}
      </div>
    </CinematicSection>
  );
}

function SecuritySection() {
  return (
    <CinematicSection id="security" navTone="slate" toneClass="bg-slate-blue" dark eyebrow="Security" title="Private By Default, Readable When Your People Need It">
      <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="landing-reveal text-base font-light leading-8 text-offwhite/68">
            Nythera keeps the secret encrypted and separates it from the list of people allowed to recover it. That means your backup can exist without handing anyone the secret today.
          </p>
          <div className="landing-reveal landing-reveal-delay-1 mt-8">
            <Link href="/dashboard" className="group relative inline-flex min-h-11 items-center justify-center overflow-hidden bg-offwhite px-6 py-3 text-sm font-semibold text-ink transition hover:bg-muted-gold">
              <span className="absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition duration-700 group-hover:translate-x-[120%]" />
              <span className="relative">Review Your Vaults</span>
            </Link>
          </div>
        </div>
        <div className="grid gap-3">
          {securityPoints.map((point, index) => (
            <div key={point} className={`landing-reveal landing-reveal-delay-${Math.min(index % 4, 3)} flex items-center gap-4 border border-white/12 bg-white/10 p-4 text-sm text-offwhite/72`}>
              <span className="h-2 w-2 bg-muted-gold" />
              {point}
            </div>
          ))}
        </div>
      </div>
    </CinematicSection>
  );
}

function FaqSection() {
  return (
    <CinematicSection id="faq" navTone="teal" toneClass="bg-pale-teal" title="FAQ">
      <div className="grid gap-4 md:grid-cols-2">
        {faqs.map(([question, answer]) => (
          <details key={question} className="group landing-reveal border border-ink/10 bg-white/38 p-5 open:border-warm-clay/45">
            <summary className="font-display flex cursor-pointer list-none items-center justify-between gap-4 text-xl text-ink [&::-webkit-details-marker]:hidden">
              <span>{question}</span>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-warm-clay/45 text-warm-clay transition-transform duration-200 group-open:rotate-180">
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                  <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </summary>
            <p className="mt-4 text-sm leading-7 text-ink/58">{answer}</p>
          </details>
        ))}
      </div>
    </CinematicSection>
  );
}

function Footer() {
  return (
    <footer data-nav-tone="dark" id="footer" className="relative z-10 overflow-hidden bg-ink text-offwhite">
      <div className="border-y border-white/[0.07] py-5">
        <div className="landing-footer-marquee whitespace-nowrap">
          {[0, 1].map((group) => (
            <span key={group} className="inline-flex">
              {footerMarquee.map((item) => (
                <span key={`${group}-${item}`} className="px-12 font-display text-xs font-bold uppercase tracking-[0.25em] text-offwhite/18">
                  {item}<span className="mx-6 text-muted-gold">*</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
      <div className="mx-auto grid max-w-[1300px] gap-12 px-6 py-20 md:px-10 lg:grid-cols-[1.8fr_1fr_1fr]">
        <div>
          <h2 className="font-cinzel text-3xl font-extrabold tracking-[-0.04em]">
            Nythera
          </h2>
          <p className="mt-4 max-w-[280px] text-sm font-light leading-7 text-offwhite/45">
            The decentralized emergency wallet recovery protocol.
          </p>
        </div>
        {Object.entries(footerColumns).map(([title, links], index) => (
          <div key={title} className={`landing-reveal landing-reveal-delay-${Math.min(index + 1, 3)}`}>
            <h4 className="font-display text-[0.82rem] font-bold uppercase tracking-[0.12em] text-offwhite/35 mb-5">
              {title}
            </h4>
            <ul className="list-none flex flex-col gap-3 p-0 m-0">
              {links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="font-body text-[0.88rem] font-light text-offwhite/55 transition-colors duration-200 hover:text-offwhite"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-[1300px] flex-col items-center justify-between gap-4 border-t border-white/[0.06] px-6 py-8 md:flex-row md:px-16">
        <span className="font-mono text-[0.68rem] text-offwhite/20 tracking-[0.08em]">
          (c) {new Date().getFullYear()} Nythera Protocol
        </span>
      </div>
    </footer>
  );
}

function CinematicSection({
  id,
  navTone,
  toneClass,
  dark = false,
  eyebrow,
  title,
  titleClassName,
  children,
}: {
  id: string;
  navTone: NavTone;
  toneClass: string;
  dark?: boolean;
  eyebrow?: string;
  title: string;
  titleClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section data-nav-tone={navTone} id={id} className={`relative z-10 min-h-screen border-b px-4 py-24 md:px-16 md:py-32 ${toneClass} ${dark ? 'border-white/10' : 'border-ink/10'}`}>
      <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-120px' }} className="relative mx-auto max-w-7xl">
        <motion.div variants={fadeUp} className="landing-reveal mb-14 max-w-4xl">
          {eyebrow ? (
            <p className={`mb-5 font-mono text-[0.7rem] uppercase tracking-[0.2em] ${dark ? 'text-offwhite/45' : 'text-ink/45'}`}>{eyebrow}</p>
          ) : null}
          <h2 className={`${titleClassName ?? 'font-body'} text-[clamp(1.9rem,3.2vw,2.9rem)] font-extrabold leading-[1.08] tracking-[-0.02em] ${dark ? 'text-offwhite' : 'text-ink'}`}>{title}</h2>
        </motion.div>
        <motion.div variants={fadeUp}>{children}</motion.div>
      </motion.div>
    </section>
  );
}

function slug(value: string) {
  return value.toLowerCase().replace(/\s+/g, '-');
}




