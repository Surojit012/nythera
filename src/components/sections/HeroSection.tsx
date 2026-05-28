'use client'

import Link from 'next/link'
import GrainOverlay from '@/components/ui/GrainOverlay'
import ShardVisual from '@/components/ui/ShardVisual'
import { SparkleIcon } from '@/components/ui/Icons'

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="bg-offwhite min-h-[95vh] flex flex-col items-center justify-center px-6 md:px-16 lg:px-24 pt-40 pb-32 lg:pt-48 lg:pb-40 text-center relative"
    >
      <GrainOverlay />

      {/* Badge */}
      <div className="relative z-10 inline-flex items-center gap-2 font-mono text-[0.72rem] tracking-[0.15em] uppercase text-warm-clay border border-warm-clay/35 px-4 py-1.5 mb-12 animate-fade-in-down">
        <SparkleIcon size={12} className="animate-pulse" />
        Decentralized Recovery Vault · Story Protocol
      </div>

      {/* Headline */}
      <h1 className="relative z-10 font-display font-extrabold text-[clamp(3.5rem,7vw,7rem)] leading-[0.95] tracking-[-0.04em] text-ink max-w-[1000px] mb-8 animate-fade-in-up">
        Your keys.
        <br />
        <span className="font-serif italic font-normal text-warm-clay">Your legacy.</span>
        <br />
        Never lost.
      </h1>

      {/* Subtitle */}
      <p className="relative z-10 font-body text-lg font-light text-[#5a5a5a] max-w-[680px] leading-relaxed mb-16 animate-fade-in-up [animation-delay:0.2s]">
        Nythera is a decentralized recovery vault for your existing crypto wallets. Encrypt your seed phrase locally, split the encryption key across trusted guardians, and store everything on-chain — without ever exposing the full phrase.
      </p>

      {/* Hero Actions */}
      <div className="relative z-10 flex flex-col sm:flex-row gap-5 items-center animate-fade-in-up [animation-delay:0.3s]">
        <Link
          href="/dashboard"
          className="font-display font-bold text-[0.9rem] tracking-[0.06em] uppercase px-8 py-4 bg-ink text-offwhite no-underline transition-all duration-200 hover:-translate-y-1 hover:shadow-xl inline-block"
        >
          Open App
        </Link>
        <Link
          href="/#how"
          className="font-body text-[0.9rem] font-medium px-7 py-4 border-[1.5px] border-ink/25 bg-transparent text-ink no-underline transition-all duration-200 hover:border-ink hover:bg-ink/[0.04] inline-block"
        >
          See How It Works →
        </Link>
      </div>

      {/* Shard Visual */}
      <ShardVisual />
    </section>
  )
}
