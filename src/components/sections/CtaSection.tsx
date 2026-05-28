'use client';

import { useState } from 'react';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { SparkleIcon, ArrowRightIcon } from '@/components/ui/Icons';

export default function CtaSection() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (email.includes('@')) {
      setSubmitted(true);
      setError(false);
    } else {
      setError(true);
      setEmail('');
    }
  };

  return (
    <section
      id="cta"
      className="bg-offwhite py-44 lg:py-56 px-6 md:px-16 lg:px-24 flex flex-col items-center justify-center text-center"
    >
      <ScrollReveal>
        <p className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-ink/45 mb-5">
          Get Started
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <h2 className="font-display text-[clamp(3rem,6vw,6rem)] font-extrabold tracking-[-0.04em] leading-[0.95] text-ink max-w-[800px] mb-8">
          Secure your legacy.
          <br />
          <span className="font-serif italic font-normal text-warm-clay">
            Before it&apos;s too late.
          </span>
        </h2>
      </ScrollReveal>

      <ScrollReveal delay={0.2}>
        <p className="font-body text-lg font-light text-[#5a5a5a] max-w-[620px] leading-relaxed mb-12">
          Initialize your decentralized recovery vault on Story Protocol. Split, distribute, and protect your digital assets today.
        </p>
      </ScrollReveal>

      {/* Primary CTA Button */}
      <ScrollReveal delay={0.25}>
        <div className="mb-16">
          <a
            href="/dashboard"
            className="font-display font-bold text-[0.95rem] tracking-[0.06em] uppercase px-10 py-5 bg-ink text-offwhite no-underline transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl flex items-center gap-3"
          >
            Open Recovery Vault <ArrowRightIcon size={16} />
          </a>
        </div>
      </ScrollReveal>

      {/* Secondary Waitlist Form */}
      <ScrollReveal delay={0.3}>
        <div className="max-w-[480px] w-full flex flex-col items-center gap-4">
          <span className="font-mono text-[0.65rem] tracking-[0.1em] uppercase text-ink/50 block">
            Or subscribe to development updates
          </span>
          <form
            onSubmit={handleSubmit}
            className="flex gap-0 w-full mb-3"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(false);
              }}
              disabled={submitted}
              placeholder={error ? 'Valid email please' : 'your@email.com'}
              className={`flex-1 font-body text-[0.9rem] px-5 py-4 border-[1.5px] bg-white/70 text-ink outline-none transition-colors placeholder:text-ink/35 ${
                error
                  ? 'border-warm-clay'
                  : 'border-ink/20 focus:border-warm-clay'
              } ${submitted ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
            <button
              type="submit"
              disabled={submitted}
              className={`font-display text-[0.85rem] font-bold tracking-[0.06em] uppercase px-7 py-4 border-none cursor-pointer transition-all flex items-center gap-2 ${
                submitted
                  ? 'bg-pale-teal text-ink cursor-not-allowed'
                  : 'bg-ink text-offwhite hover:bg-warm-clay'
              }`}
            >
              {submitted ? (
                <>
                  In <SparkleIcon size={12} className="inline animate-spin" />
                </>
              ) : (
                'Subscribe'
              )}
            </button>
          </form>
          <span className="font-mono text-[0.65rem] text-ink/35 tracking-[0.08em]">
            No spam. Fully private. Unsubscribe anytime.
          </span>
        </div>
      </ScrollReveal>
    </section>
  );
}
