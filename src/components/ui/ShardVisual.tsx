'use client';

const shards = [
  { label: 'Shard A · You', words: 'word1 · word4 · word8', variant: 'default' },
  { label: 'Shard B · Guardian 1', words: 'word2 · word5 · word9', variant: 'guardian' },
  { label: 'Shard C · Guardian 2', words: 'word3 · word6 · word10', variant: 'guardian' },
  { label: 'Shard D · Timelock', words: 'word7 · word11 · word12', variant: 'locked' },
];

const variantStyles: Record<string, string> = {
  default: 'bg-white/60 border-ink/[0.12] text-ink',
  guardian: 'bg-pale-teal/[0.15] border-pale-teal/40 text-[#6a9e98]',
  locked: 'bg-warm-clay/[0.08] border-warm-clay/30 text-warm-clay',
};

export default function ShardVisual() {
  return (
    <div className="w-full max-w-[780px] mx-auto mt-16">
      <div className="flex flex-wrap gap-4 justify-center">
        {shards.map((shard, i) => (
          <div
            key={i}
            className={`font-mono text-[0.78rem] px-5 py-3 border backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1 ${variantStyles[shard.variant]}`}
            style={{
              animation: `float ${3 + i * 0.4}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.2}s`,
            }}
          >
            <span className="block text-[0.6rem] uppercase tracking-[0.1em] opacity-50 mb-0.5">
              {shard.label}
            </span>
            {shard.words}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-ink/30 font-mono text-[0.7rem] my-6">
        <div className="flex-1 h-px bg-ink/10" />
        CDR-encrypted · 2-of-4 threshold · on-chain proof
        <div className="flex-1 h-px bg-ink/10" />
      </div>
    </div>
  );
}
