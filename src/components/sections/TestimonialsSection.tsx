'use client';

import ScrollReveal from '@/components/ui/ScrollReveal';
import { WalletIcon, ScaleIcon, BuildingIcon } from '@/components/ui/Icons';

const testimonials = [
  {
    text: 'I lost my hardware wallet during a relocate. Nythera is exactly what the space needed — decentralized recovery that actually makes sense, protecting my funds without trust assumptions.',
    avatar: <WalletIcon size={18} className="text-warm-clay" />,
    name: '@defi_ramesh.eth',
    role: 'DeFi Specialist · Mumbai',
  },
  {
    text: "I've been setting up estate planning for my client's crypto holdings for years with no good solution. This is the first protocol that handles it at the cryptographic layer, not just trust.",
    avatar: <ScaleIcon size={18} className="text-warm-clay" />,
    name: 'Sarah K.',
    role: 'Web3 Lawyer · Singapore',
  },
  {
    text: 'Set this up for our DAO treasury in 20 minutes. Six guardians, 4-of-6 threshold. Feels like the kind of security that should have been standard from day one.',
    avatar: <BuildingIcon size={18} className="text-warm-clay" />,
    name: '@0xcoordinator',
    role: 'DAO Treasurer · Protocol Labs',
  },
];

export default function TestimonialsSection() {
  return (
    <section
      id="trust"
      className="bg-charcoal min-h-screen flex flex-col items-center justify-center px-6 md:px-16 lg:px-24 py-40 lg:py-52"
    >
      {/* Header */}
      <div className="text-center max-w-[680px] mb-24 lg:mb-32">
        <ScrollReveal>
          <p className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-offwhite/35 mb-5">
            Early Believers
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <h2 className="font-display text-[clamp(2.2rem,4vw,3.5rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-offwhite mb-6">
            The community <span className="font-serif italic font-normal text-warm-clay">speaks.</span>
          </h2>
        </ScrollReveal>
      </div>

      {/* Testimonial Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-[1200px] w-full">
        {testimonials.map((t, i) => (
          <ScrollReveal key={t.name} delay={i * 0.1}>
            <div className="bg-white/[0.04] border border-white/[0.07] p-8 md:p-12 relative transition-all duration-300 hover:border-muted-gold/35 rounded-xl flex flex-col justify-between h-full">
              {/* Quote mark */}
              <div className="absolute top-4 left-6 font-serif text-[5rem] text-muted-gold/20 leading-none pointer-events-none select-none">
                &ldquo;
              </div>

              {/* Quote text */}
              <p className="font-body text-[0.92rem] leading-relaxed text-offwhite/75 font-light mb-8 pt-8 flex-grow">
                {t.text}
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-muted-gold/15 border border-muted-gold/25 flex items-center justify-center">
                  {t.avatar}
                </div>
                <div>
                  <p className="font-display text-[0.88rem] font-bold text-offwhite">
                    {t.name}
                  </p>
                  <p className="font-body text-[0.75rem] text-offwhite/40 font-light">
                    {t.role}
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
