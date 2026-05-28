'use client';

import ScrollReveal from '@/components/ui/ScrollReveal';

const steps = [
  {
    number: '01',
    title: 'Connect Your Wallet',
    description:
      'Link your existing EVM wallet to establish ownership. Nythera never takes control — you remain the sole custodian of your assets.',
  },
  {
    number: '02',
    title: 'Encrypt Your Seed Phrase',
    description:
      'Your seed phrase is encrypted in-browser using AES-256-GCM. The plaintext never leaves your device — it exists only in memory during encryption.',
  },
  {
    number: '03',
    title: 'Split the Encryption Key',
    description:
      'The AES key is split into shares using Shamir Secret Sharing. No single share can reconstruct the key — only a threshold combination can.',
  },
  {
    number: '04',
    title: 'Distribute & Register',
    description:
      'Encrypted shards go to IPFS and Arweave. Recovery conditions are registered as programmable policies on Story Protocol.',
  },
];

export default function HowItWorksSection() {
  return (
    <section
      id="how"
      className="bg-dusty-rose min-h-screen flex flex-col items-center justify-center px-6 md:px-16 lg:px-24 py-40 lg:py-52"
    >
      {/* Header */}
      <div className="text-center max-w-[680px] mb-24 lg:mb-32">
        <ScrollReveal>
          <p className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-ink/45 mb-5">
            The Protocol
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <h2 className="font-display text-[clamp(2.2rem,4vw,3.5rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink mb-6">
            How Nythera{' '}
            <span className="font-serif italic font-normal text-warm-clay">works</span>
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <p className="font-body text-base leading-relaxed text-[#3a3a3a] font-light">
            Four simple steps to secure your wallet continuity without ever storing the full phrase in one place.
          </p>
        </ScrollReveal>
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 max-w-[1200px] w-full gap-10 md:gap-12 lg:gap-16 relative">
        {/* Connecting line (lg screens only) */}
        <div className="hidden lg:block absolute top-[2.5rem] left-[10%] right-[10%] h-px bg-ink/15" />

        {steps.map((step, index) => (
          <ScrollReveal key={step.number} delay={index * 0.1}>
            <div className="group px-4 py-4 text-center relative flex flex-col items-center">
              {/* Step Number */}
              <div className="w-20 h-20 border-[1.5px] border-ink/20 bg-white/50 backdrop-blur-sm flex items-center justify-center font-mono text-[0.8rem] text-ink mx-auto mb-8 relative z-10 transition-all duration-300 group-hover:bg-white/85 group-hover:scale-[1.08] rounded-full">
                {step.number}
              </div>

              {/* Step Content */}
              <h4 className="font-display text-base font-bold mb-3.5 text-ink">
                {step.title}
              </h4>
              <p className="font-body text-[0.85rem] text-[#4a3a35] leading-relaxed font-light">
                {step.description}
              </p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
