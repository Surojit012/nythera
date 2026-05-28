'use client'

import ScrollReveal from '@/components/ui/ScrollReveal'
import {
  UserIcon,
  UsersIcon,
  CodeIcon,
  BuildingIcon,
  ClockIcon,
} from '@/components/ui/Icons'

const guardianNodes = [
  { icon: <UserIcon size={28} className="text-offwhite" />, label: 'You\nOwner', badge: 'Shard A', isYou: true },
  { icon: <UsersIcon size={24} className="text-offwhite" />, label: 'Guardian 1\nFamily / Trusted', badge: 'Shard B', isYou: false },
  {
    icon: <CodeIcon size={24} className="text-offwhite" />,
    label: 'Guardian 2\nFriend / Dev',
    badge: 'Shard C',
    isYou: false,
  },
  {
    icon: <BuildingIcon size={24} className="text-offwhite" />,
    label: 'Guardian 3\nLawyer / Institution',
    badge: 'Shard D',
    isYou: false,
  },
  {
    icon: <ClockIcon size={24} className="text-offwhite" />,
    label: 'Timelock\nAuto Trigger',
    badge: 'Deadman Switch',
    isYou: false,
  },
]

function ConnectorArrow() {
  return (
    <div className="hidden md:flex items-center">
      <div className="w-[60px] h-px bg-offwhite/25 relative">
        {/* Arrow head */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-t border-r border-offwhite/40 rotate-45 -translate-x-px" />
      </div>
    </div>
  )
}

export default function GuardiansSection() {
  return (
    <section
      id="guardians"
      className="bg-warm-clay min-h-screen flex flex-col items-center justify-center px-6 md:px-16 lg:px-24 py-40 lg:py-52"
    >
      {/* Header */}
      <div className="text-center max-w-[680px] mb-24 lg:mb-32">
        <ScrollReveal>
          <p className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-offwhite/55 mb-5">
            The Guardian Model
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <h2 className="font-display text-[clamp(2.2rem,4vw,3.5rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-offwhite mb-6">
            Trust by design.
            <br />
            <span className="font-serif italic font-normal text-ink">Not by default.</span>
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <p className="font-body text-base leading-relaxed text-offwhite/75 font-light">
            Your guardians never see your full seed phrase — only an encrypted shard that&apos;s useless alone. Recovery requires a programmable threshold consensus (e.g. 2-of-4), checking for timelocks or guardian signatures on Story Protocol.
          </p>
        </ScrollReveal>
      </div>

      {/* Guardian Flow */}
      <ScrollReveal delay={0.2}>
        <div className="flex items-center gap-8 max-w-[1200px] w-full justify-center flex-wrap">
          {guardianNodes.map((node, index) => (
            <div key={node.label} className="contents">
              {/* Node */}
              <div className="flex flex-col items-center gap-4">
                {/* Avatar */}
                <div
                  className={`${
                    node.isYou ? 'w-24 h-24' : 'w-20 h-20'
                  } rounded-full bg-offwhite/15 border-2 border-offwhite/30 flex items-center justify-center transition-all duration-300 hover:scale-115 hover:bg-offwhite/25`}
                >
                  {node.icon}
                </div>

                {/* Label */}
                <span className="font-mono text-[0.65rem] tracking-[0.1em] uppercase text-offwhite/70 text-center whitespace-pre-line leading-relaxed">
                  {node.label}
                </span>

                {/* Shard Badge */}
                <span className="font-mono text-[0.6rem] px-2.5 py-1 bg-offwhite/[0.12] border border-offwhite/20 text-offwhite/80 tracking-[0.08em] rounded">
                  {node.badge}
                </span>
              </div>

              {/* Connector (not after last node) */}
              {index < guardianNodes.length - 1 && <ConnectorArrow />}
            </div>
          ))}
        </div>
      </ScrollReveal>

      {/* Footer Text */}
      <ScrollReveal delay={0.3}>
        <p className="font-mono text-[0.7rem] text-offwhite/40 tracking-[0.12em] text-center mt-16">
          2-OF-4 THRESHOLD REQUIRED · ANY COMBINATION WORKS · ZERO CUSTODIAL TRUST IN INDIVIDUALS
        </p>
      </ScrollReveal>
    </section>
  )
}
