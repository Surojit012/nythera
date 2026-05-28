'use client';

import ScrollReveal from '@/components/ui/ScrollReveal';

const stats = [
  { number: '0', description: 'Times seed phrase exists whole' },
  { number: '100%', description: 'Client-side, zero-knowledge' },
  { number: 'CDR', description: 'On-chain recovery policies' },
  { number: 'M-of-N', description: 'Customizable thresholds' },
];

export default function StatsBar() {
  return (
    <div
      id="stats-bar"
      className="bg-muted-gold py-20 lg:py-24 px-6 md:px-16 lg:px-24 flex justify-center"
    >
      <div className="flex flex-wrap gap-12 md:gap-20 lg:gap-28 max-w-[1200px] w-full justify-center">
        {stats.map((stat, i) => (
          <ScrollReveal key={stat.number} delay={i * 0.1}>
            <div className="text-center min-w-[180px]">
              <span className="font-display text-5xl lg:text-6xl font-extrabold tracking-[-0.04em] text-ink block">
                {stat.number}
              </span>
              <span className="font-body text-[0.85rem] text-ink/65 font-normal mt-2.5 block max-w-[200px] mx-auto">
                {stat.description}
              </span>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
