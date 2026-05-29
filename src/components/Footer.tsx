import Link from 'next/link';

const shardPattern = Array.from({ length: 120 }, (_, index) => ((index * 17) % 23 > 18 ? 4 : 2));

const footerLinks = {
  protocol: [
    { label: 'How It Works', href: '/#how' },
    { label: 'CDR Technology', href: '/#tech' },
    { label: 'Guardian Model', href: '/#guardians' },
    { label: 'Documentation', href: '/docs' },
    { label: 'Security Audit (Soon)', href: '#' },
  ],
  product: [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Create Vault', href: '/vault/create' },
    { label: 'Recover', href: '/recover' },
    { label: 'SDK / API (Soon)', href: '#' },
    { label: 'Pricing (Soon)', href: '#' },
  ],
  company: [
    { label: 'About Nythera (Soon)', href: '#' },
    { label: 'Blog (Soon)', href: '#' },
    { label: 'Careers (Soon)', href: '#' },
    { label: 'Press Kit (Soon)', href: '#' },
    { label: 'Contact (Soon)', href: '#' },
  ],
};

const socials = [
  { label: 'Twitter', href: '#' },
  { label: 'Discord', href: '#' },
  { label: 'GitHub', href: '#' },
  { label: 'Docs', href: '/docs' },
];

const trustBadges = [
  'Open Source',
  'Client-Side Encryption',
  'Non-Custodial',
  'Story Protocol',
  'IPFS Storage',
  'CDR Powered',
];

export default function Footer() {
  return (
    <footer className="bg-ink text-offwhite overflow-hidden">
      {/* Interactive shard bar */}
      <div className="py-12 px-6 md:px-16 border-t border-white/[0.06] flex items-center justify-center gap-px flex-nowrap overflow-hidden">
        {shardPattern.map((h, i) => (
          <div
            key={i}
            style={{ height: `${h}px` }}
            className="flex-1 bg-muted-gold/15 transition-all duration-300 cursor-pointer hover:bg-muted-gold hover:h-1"
          />
        ))}
      </div>

      {/* Main footer grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.8fr_1fr_1fr_1fr] gap-10 lg:gap-16 px-6 md:px-16 py-24 max-w-[1200px] mx-auto">
        {/* Brand */}
        <div>
          <h2 className="font-display text-3xl font-extrabold tracking-[-0.04em] mb-4">
            Nyth<span className="text-muted-gold">era</span>
          </h2>
          <p className="font-body text-[0.88rem] leading-relaxed text-offwhite/45 font-light max-w-[280px] mb-7">
            The first decentralized emergency wallet recovery protocol. Split.
            Distribute. Recover. Your phrase — never whole, never lost.
          </p>
          <div className="flex flex-wrap gap-3">
            {socials.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className="font-mono text-[0.65rem] tracking-[0.1em] uppercase px-3.5 py-2 border border-offwhite/[0.12] text-offwhite/50 no-underline transition-all duration-200 hover:border-muted-gold hover:text-muted-gold"
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Link columns */}
        {Object.entries(footerLinks).map(([title, links]) => (
          <div key={title}>
            <h4 className="font-display text-[0.82rem] font-bold tracking-[0.12em] uppercase text-offwhite/35 mb-5">
              {title}
            </h4>
            <ul className="list-none flex flex-col gap-3 p-0 m-0">
              {links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="font-body text-[0.88rem] text-offwhite/55 no-underline font-light transition-colors duration-200 hover:text-offwhite"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Trust badges */}
      <div className="flex flex-wrap gap-8 px-6 md:px-16 py-8 border-t border-white/[0.04] justify-center">
        {trustBadges.map((badge) => (
          <div
            key={badge}
            className="flex items-center gap-2 font-mono text-[0.65rem] tracking-[0.1em] uppercase text-offwhite/25"
          >
            <span className="w-[5px] h-[5px] rounded-full bg-pale-teal/40" />
            {badge}
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-6 md:px-16 py-8 border-t border-white/[0.06] max-w-[1200px] mx-auto gap-4">
        <span className="font-mono text-[0.68rem] text-offwhite/20 tracking-[0.08em]">
          © {new Date().getFullYear()} Nythera Protocol · All rights reserved · Built with CDR
        </span>
        <div className="flex gap-8">
          {['Privacy', 'Terms', 'Security', 'Status'].map((link) => (
            <a
              key={link}
              href="#"
              className="font-mono text-[0.68rem] text-offwhite/20 no-underline tracking-[0.06em] uppercase transition-colors duration-200 hover:text-offwhite"
            >
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

