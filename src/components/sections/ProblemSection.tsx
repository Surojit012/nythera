'use client'

import ScrollReveal from '@/components/ui/ScrollReveal'
import CountUp from '@/components/ui/CountUp'
import { ShieldIcon, SkullIcon, EyeIcon, BrainIcon } from '@/components/ui/Icons'

const problemCards = [
  {
    icon: <ShieldIcon size={20} className="text-warm-clay" />,
    title: 'Single Point of Failure',
    body: 'Most users store one paper copy, one screenshot, or one cloud backup. If compromised, all assets are exposed.',
  },
  {
    icon: <SkullIcon size={20} className="text-warm-clay" />,
    title: 'No Inheritance Layer',
    body: 'Crypto inheritance remains unsolved. Families cannot recover wallets, seed phrases, or cold storage assets after death, disappearance, or inactivity.',
  },
  {
    icon: <EyeIcon size={20} className="text-warm-clay" />,
    title: 'Existing Solutions Require Trust',
    body: 'Most recovery systems rely on centralized servers, custodial recovery, or platform-controlled encryption — violating the core philosophy of self-custody.',
  },
  {
    icon: <BrainIcon size={20} className="text-warm-clay" />,
    title: 'Seed Phrase Loss',
    body: 'Users frequently lose access to paper backups, hard drives, cloud notes, and password managers. Result: permanent loss of funds.',
  },
]

export default function ProblemSection() {
  return (
    <section
      id="problem"
      className="bg-sage min-h-screen flex items-center justify-center px-6 md:px-16 lg:px-24 py-40 lg:py-52"
    >
      <div className="max-w-[1200px] w-full grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 lg:gap-32 items-center">
        {/* Left Column */}
        <div className="flex flex-col gap-6 lg:gap-8">
          <ScrollReveal>
            <span className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-ink/45 mb-2 block">
              The Stakes
            </span>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <h2 className="font-display text-[clamp(2.2rem,4vw,3.5rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink mb-2">
              Billions locked.
              <br />
              <span className="font-serif italic font-normal text-warm-clay">Forever.</span>
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <p className="font-body text-base leading-relaxed text-[#3a3a3a] font-light max-w-lg">
              A single paper slip stands between your family and everything you&apos;ve built on-chain. Traditional custody has no middle ground: either you re-introduce centralized trust, or you risk permanent loss of funds from a single human error.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <div className="mt-4">
              <CountUp
                end="$140B+"
                className="font-display text-[3.5rem] lg:text-[4.5rem] font-extrabold text-ink tracking-[-0.04em] block"
              />
              <span className="font-body text-[0.85rem] text-[#555] mt-1 block">
                estimated in permanently lost or inaccessible crypto assets
              </span>
            </div>
          </ScrollReveal>
        </div>

        {/* Right Column */}
        <ScrollReveal delay={0.2}>
          <div className="flex flex-col gap-6 lg:gap-8">
            {problemCards.map((card) => (
              <div
                key={card.title}
                className="bg-white/45 border border-ink/[0.08] p-8 md:p-10 rounded-xl transition-transform duration-300 hover:translate-x-1.5 flex gap-5 items-start"
              >
                <div className="mt-1 flex-shrink-0">{card.icon}</div>
                <div>
                  <h4 className="font-display text-base font-bold mb-2 text-ink">
                    {card.title}
                  </h4>
                  <p className="font-body text-[0.88rem] text-[#555] leading-relaxed font-light">
                    {card.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
