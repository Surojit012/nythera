'use client'

import ScrollReveal from '@/components/ui/ScrollReveal'
import { LockIcon, ChainIcon, ClockIcon, ArrowRightIcon } from '@/components/ui/Icons'

const features = [
  {
    icon: <LockIcon size={22} className="text-warm-clay" />,
    title: 'Encrypted Vault Layer',
    body: 'Encrypt your seed phrase locally using AES-GCM. The full phrase never exists in one place.',
  },
  {
    icon: <ChainIcon size={22} className="text-warm-clay" />,
    title: 'Decentralized Access Control',
    body: 'Register recovery permissions on Story Protocol. Your guardians can never access the full key alone.',
  },
  {
    icon: <ClockIcon size={22} className="text-warm-clay" />,
    title: 'Programmable Inheritance',
    body: 'Set inactivity triggers and deadman switches. Your assets transition to beneficiaries automatically.',
  },
]

const pipelineSteps = [
  { label: 'Seed Phrase' },
  { label: 'AES-GCM Encrypt' },
  { label: 'Key Split (Shamir)' },
  { label: 'Distribute Shards' },
  { label: 'Store on IPFS/Arweave' },
]

export default function SolutionSection() {
  return (
    <section
      id="solution"
      className="bg-offwhite px-6 md:px-16 lg:px-24 py-40 lg:py-52"
    >
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="text-center mb-24 lg:mb-32">
          <ScrollReveal>
            <p className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-ink/45 mb-5">
              The Solution
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <h2 className="font-display text-[clamp(2.2rem,4vw,3.5rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink mb-6">
              Not a wallet.
              <br />
              A{' '}
              <span className="font-serif italic font-normal text-warm-clay">
                recovery vault.
              </span>
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <p className="font-body text-base leading-relaxed text-[#3a3a3a] font-light max-w-[640px] mx-auto">
              Nythera doesn&apos;t replace your wallet. It wraps your seed phrase in
              military-grade encryption, splits the key across trusted guardians,
              and registers recovery rules on-chain.
            </p>
          </ScrollReveal>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 lg:gap-12 mb-24 lg:mb-32">
          {features.map((feature, index) => (
            <ScrollReveal key={feature.title} delay={index * 0.12}>
              <div className="bg-white/45 backdrop-blur-sm border border-ink/[0.08] p-8 md:p-12 rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group h-full">
                <div className="w-12 h-12 bg-warm-clay/10 flex items-center justify-center rounded-lg mb-6 transition-transform duration-300 group-hover:scale-110">
                  {feature.icon}
                </div>
                <h3 className="font-display text-lg font-bold text-ink mb-3">
                  {feature.title}
                </h3>
                <p className="font-body text-[0.88rem] text-[#555] leading-relaxed font-light">
                  {feature.body}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Pipeline Diagram */}
        <ScrollReveal delay={0.15}>
          <div className="bg-white/40 backdrop-blur-sm border border-ink/[0.08] rounded-2xl p-8 md:p-12 lg:p-16">
            <p className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-ink/40 mb-8 text-center">
              Encryption Pipeline
            </p>

            {/* Desktop Flow (horizontal) */}
            <div className="hidden lg:flex items-center justify-center gap-0">
              {pipelineSteps.map((step, index) => (
                <div key={step.label} className="flex items-center">
                  <div className="flex flex-col items-center group">
                    {/* Step Number */}
                    <span className="font-mono text-[0.6rem] text-warm-clay/60 mb-2">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {/* Step Box */}
                    <div className="bg-ink/[0.04] border border-ink/[0.12] px-5 py-3.5 rounded-lg transition-all duration-300 group-hover:bg-ink/[0.07] group-hover:border-warm-clay/30">
                      <span className="font-mono text-[0.75rem] text-ink whitespace-nowrap">
                        {step.label}
                      </span>
                    </div>
                  </div>

                  {/* Arrow between steps */}
                  {index < pipelineSteps.length - 1 && (
                    <div className="mx-3 flex-shrink-0 text-warm-clay/50">
                      <ArrowRightIcon size={16} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Mobile Flow (vertical) */}
            <div className="flex lg:hidden flex-col items-center gap-0">
              {pipelineSteps.map((step, index) => (
                <div key={step.label} className="flex flex-col items-center">
                  <div className="flex items-center gap-3 group">
                    <span className="font-mono text-[0.6rem] text-warm-clay/60 w-5">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="bg-ink/[0.04] border border-ink/[0.12] px-6 py-3 rounded-lg transition-all duration-300 group-hover:bg-ink/[0.07] group-hover:border-warm-clay/30 min-w-[200px] text-center">
                      <span className="font-mono text-[0.75rem] text-ink">
                        {step.label}
                      </span>
                    </div>
                  </div>

                  {/* Vertical arrow */}
                  {index < pipelineSteps.length - 1 && (
                    <div className="py-2 text-warm-clay/50 rotate-90">
                      <ArrowRightIcon size={14} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Bottom Tagline */}
        <ScrollReveal delay={0.2}>
          <p className="text-center font-serif italic text-lg text-ink/50 mt-16 lg:mt-20">
            Your phrase — never whole, never lost.
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}
