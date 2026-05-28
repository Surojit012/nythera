'use client';

import ScrollReveal from '@/components/ui/ScrollReveal';
import { LockIcon, ChainIcon, ClockIcon, GlobeIcon } from '@/components/ui/Icons';

const features = [
  {
    icon: <LockIcon size={20} className="text-warm-clay" />,
    title: 'AES-256-GCM + Shamir Split',
    description:
      'Client-side encryption generates a random 256-bit key. The key — not the seed phrase — is split via Shamir Secret Sharing into M-of-N shares.',
  },
  {
    icon: <ChainIcon size={20} className="text-warm-clay" />,
    title: 'Story Protocol CDR Registry',
    description:
      'Recovery conditions are registered as on-chain IP Assets on Story Protocol. Policies are immutable, verifiable, and owned by you.',
  },
  {
    icon: <ClockIcon size={20} className="text-warm-clay" />,
    title: 'Programmable Timelocks',
    description:
      'Configure inactivity triggers, deadman switches, or manual approval requirements. Recovery is programmable, not just permissioned.',
  },
  {
    icon: <GlobeIcon size={20} className="text-warm-clay" />,
    title: 'Decentralized Storage',
    description:
      'The encrypted blob is stored across IPFS, Arweave, and Walrus. The key shares are distributed to guardians. Nothing is centralized.',
  },
];

export default function TechnologySection() {
  return (
    <section
      id="tech"
      className="bg-slate-blue min-h-screen flex items-center justify-center px-6 md:px-16 lg:px-24 py-40 lg:py-52"
    >
      <div className="max-w-[1200px] w-full grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
        {/* Left Column */}
        <div className="flex flex-col gap-6 lg:gap-8">
          <ScrollReveal>
            <p className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-offwhite/40 mb-2">
              The Engine
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <h2 className="font-display text-[clamp(2.2rem,4vw,3.5rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-offwhite mb-2">
              Built on <br />
              <span className="font-serif italic font-normal text-warm-clay">Story Protocol + CDR</span>
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <p className="font-body text-base leading-relaxed text-offwhite/65 font-light">
              Nythera uses the Story Protocol blockchain to register emergency recovery conditions (CDR) as on-chain IP rights. Your recovery rules are immutable, tamper-proof, and fully owned by you, while cryptographic shards remain client-side encrypted and distributed.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <div className="flex flex-col gap-6 mt-4">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className={`flex gap-5 items-start pb-6 ${
                    index < features.length - 1
                      ? 'border-b border-white/[0.12]'
                      : ''
                  }`}
                >
                  <div className="w-11 h-11 bg-white/10 flex items-center justify-center shrink-0 rounded-lg">
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="font-display text-[0.95rem] font-bold text-offwhite mb-1.5">
                      {feature.title}
                    </h4>
                    <p className="font-body text-[0.85rem] text-offwhite/65 leading-relaxed font-light">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>

        {/* Right Column — Code Block */}
        <ScrollReveal delay={0.2}>
          <div className="glass-dark p-8 md:p-10 font-mono text-[0.78rem] leading-[1.9] text-[#e0e0e0] rounded-2xl relative shadow-2xl border border-white/5">
            {/* Terminal Dots */}
            <div className="flex gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>

            {/* Code Content */}
            <pre className="overflow-x-auto">
              <code>
                <span className="text-[#7a9e8c]">
                  {'// Encrypt seed phrase & split key'}
                </span>
                {'\n'}
                <span className="text-lavender-grey">{'const'}</span>
                {' { vault, userShare } = '}
                <span className="text-lavender-grey">{'await'}</span>
                {' '}
                <span className="text-lavender-grey">{'createVault'}</span>
                {'(\n'}
                {'  '}
                <span className="text-muted-gold">{'seedPhrase'}</span>
                {',\n'}
                {'  '}
                <span className="text-muted-gold">{'walletAddress'}</span>
                {',\n'}
                {'  '}
                <span className="text-muted-gold">{'guardians'}</span>
                {',\n'}
                {'  '}
                <span className="text-muted-gold">{'threshold'}</span>
                {'\n'}
                {');\n\n'}

                <span className="text-[#7a9e8c]">
                  {'// Recovery: collect shares & decrypt'}
                </span>
                {'\n'}
                <span className="text-lavender-grey">{'const'}</span>
                {' recovered = '}
                <span className="text-lavender-grey">{'await'}</span>
                {' '}
                <span className="text-lavender-grey">{'recoverVault'}</span>
                {'(\n'}
                {'  vault.'}
                <span className="text-muted-gold">{'encryptedBlob'}</span>
                {',\n'}
                {'  '}
                <span className="text-muted-gold">{'collectedShares'}</span>
                {'\n'}
                {');'}
              </code>
            </pre>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
