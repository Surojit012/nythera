'use client'

import ScrollReveal from '@/components/ui/ScrollReveal'
import {
  VaultIcon,
  UsersIcon,
  BuildingIcon,
  PlaneIcon,
  RocketIcon,
  HeartIcon,
} from '@/components/ui/Icons'

const useCases = [
  {
    icon: <VaultIcon size={24} className="text-warm-clay" />,
    title: 'Inheritance Vaults',
    description:
      'Establish a timelock-based recovery system that transfers seed phrase shards to heirs or family members after a prolonged period of wallet inactivity.',
  },
  {
    icon: <UsersIcon size={24} className="text-warm-clay" />,
    title: 'Family Crypto Recovery',
    description:
      'Secure digital assets across households. Relatives act as recovery guardians without ever seeing or possessing the full key, keeping funds private.',
  },
  {
    icon: <BuildingIcon size={24} className="text-warm-clay" />,
    title: 'DAO Treasury Recovery',
    description:
      'Distribute emergency multi-sig backup shards across DAO council members. Guard against protocol key loss without centralizing security control.',
  },
  {
    icon: <PlaneIcon size={24} className="text-warm-clay" />,
    title: 'Travel & Disaster Backup',
    description:
      'Recover lost or broken hardware wallets while abroad by having distributed guardians approve temporary reconstruction requests securely.',
  },
  {
    icon: <RocketIcon size={24} className="text-warm-clay" />,
    title: 'Startup Founder Vaults',
    description:
      'Protect startup asset reserves. Recovery requires co-founder threshold sign-offs, avoiding single points of failure or bad actor risks.',
  },
  {
    icon: <HeartIcon size={24} className="text-warm-clay" />,
    title: 'Non-Technical Users',
    description:
      'Protect assets of non-technical parents or grandparents. Guardians approve requests through a simplified, user-friendly recovery interface.',
  },
]

export default function UseCasesSection() {
  return (
    <section
      id="usecases"
      className="bg-pale-teal min-h-screen flex flex-col items-center justify-center px-6 md:px-16 lg:px-24 py-40 lg:py-52"
    >
      {/* Header */}
      <div className="text-center max-w-[680px] mb-24 lg:mb-32">
        <ScrollReveal>
          <p className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-ink/45 mb-5">
            Who It&apos;s For
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <h2 className="font-display text-[clamp(2.2rem,4vw,3.5rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink mb-6">
            Every wallet.
            <br />
            <span className="font-serif italic font-normal text-warm-clay">Every situation.</span>
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <p className="font-body text-base leading-relaxed text-[#3a3a3a] font-light">
            Whether you&apos;re a protocol founder, an active on-chain user, or managing assets for family — Nythera secures what matters.
          </p>
        </ScrollReveal>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-[1200px] w-full">
        {useCases.map((useCase, index) => (
          <ScrollReveal key={useCase.title} delay={0.1 + index * 0.08}>
            <div className="group bg-white/40 border border-ink/[0.08] p-8 md:p-12 relative overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(26,26,26,0.1)] rounded-xl flex flex-col gap-4">
              {/* Bottom accent bar */}
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-warm-clay transform scale-x-0 origin-left transition-transform duration-400 group-hover:scale-x-100" />

              <div className="mb-2">{useCase.icon}</div>

              <h3 className="font-display text-[1.1rem] font-bold text-ink tracking-[-0.02em]">
                {useCase.title}
              </h3>

              <p className="font-body text-[0.88rem] leading-relaxed text-[#3a3a3a] font-light">
                {useCase.description}
              </p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}
