'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { UsersIcon, ClockIcon, ShieldIcon } from '@/components/ui/Icons';

type VaultStatus = 'active' | 'recovering' | 'locked';

interface VaultCardProps {
  id: string;
  name?: string;
  description?: string;
  tags?: string[];
  threshold: number;
  totalShares: number;
  guardianCount: number;
  createdAt: number;
  status: VaultStatus;
  timelockDelay: string;
  ipfsCid: string;
  contentType?: 'text' | 'walrus-file';
  fileName?: string;
  walrusEndDate?: string;
  renewalMode?: 'notify' | 'autoRenew';
  recoverable?: boolean;
  recoverabilityReason?: string;
  onDelete?: () => void;
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(timestamp));
}

const statusConfig: Record<VaultStatus, { color: string; bg: string; label: string }> = {
  active: { color: 'bg-sage', bg: 'bg-sage/35', label: 'Active' },
  recovering: { color: 'bg-warm-clay', bg: 'bg-warm-clay/15', label: 'Recovering' },
  locked: { color: 'bg-red-400', bg: 'bg-dusty-rose/25', label: 'Locked' },
};

export default function VaultCard({
  id,
  name,
  description,
  tags = [],
  threshold,
  totalShares,
  guardianCount,
  createdAt,
  status,
  timelockDelay,
  ipfsCid,
  contentType = 'text',
  fileName,
  walrusEndDate,
  renewalMode,
  recoverable = true,
  recoverabilityReason,
  onDelete,
}: VaultCardProps) {
  const router = useRouter();
  const { color, bg, label } = statusConfig[status];
  const readinessLabel = !recoverable
    ? 'Not recoverable'
    : status === 'active'
      ? 'Ready'
      : status === 'recovering'
        ? 'In recovery'
        : 'Restricted';
  const storageLabel = contentType === 'walrus-file' ? 'Encrypted file backup' : 'Encrypted secret backup';
  const guardianLabel = guardianCount === 0 ? 'Only your wallet' : `${guardianCount} trusted contact${guardianCount !== 1 ? 's' : ''}`;
  const displayName = name?.trim() || 'Untitled vault';

  return (
    <div
      onClick={() => router.push(`/vault/${id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(`/vault/${id}`);
        }
      }}
      className="
        group cursor-pointer
        bg-white/45 border border-ink/[0.08] backdrop-blur-sm
        p-6 rounded-2xl
        transition-all duration-300 ease-out
        hover:-translate-y-1 hover:shadow-2xl hover:shadow-ink/10 hover:border-ink/15
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-clay/35 focus-visible:ring-offset-2 focus-visible:ring-offset-offwhite
      "
    >
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-lg bg-warm-clay/12 border border-warm-clay/25">
            <ShieldIcon size={16} className="text-warm-clay" />
          </div>
          <div>
            <p className="font-mono text-[11px] text-ink/45 uppercase tracking-[0.22em]">Vault</p>
            <p className="font-display text-lg text-ink font-semibold mt-0.5">
              {displayName}
            </p>
            {description?.trim() && (
              <p className="mt-1 max-w-xs text-xs leading-5 text-ink/55">{description.trim()}</p>
            )}
          </div>
        </div>

        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono ${bg} text-ink/70 border border-ink/10`}>
          <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
          {label}
        </span>
      </div>

      {tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {tags.slice(0, 5).map((tag) => (
            <span key={tag} className="rounded-full border border-warm-clay/20 bg-warm-clay/10 px-2 py-0.5 text-[11px] text-warm-clay">
              {tag}
            </span>
          ))}
        </div>
      )}

      {!recoverable && (
        <div className="mb-4 border border-red-300/35 bg-dusty-rose/25 px-3 py-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-red-800">Recovery unavailable</p>
          <p className="mt-1 text-xs leading-5 text-red-900/75">
            {recoverabilityReason ?? 'This vault cannot be recovered right now.'}
          </p>
        </div>
      )}

      {onDelete && (
        <div className="mb-4">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            className="rounded-lg border border-red-300/35 bg-transparent px-2.5 py-1 font-mono text-[11px] text-red-800 transition hover:bg-red-400/10"
          >
            Delete Vault
          </button>
        </div>
      )}

      <div className="mb-4">
        <div className="rounded-xl border border-ink/[0.08] bg-white/45 px-4 py-3">
          <p className="font-mono text-[11px] text-ink/45 uppercase tracking-[0.22em]">Recovery readiness</p>
          <p className="font-display text-base text-ink mt-1">{readinessLabel}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <UsersIcon size={14} className="text-ink/40" />
          <div>
            <p className="font-mono text-[11px] text-ink/45 uppercase tracking-[0.22em]">Guardians</p>
            <p className="font-mono text-xs text-ink/65">
              {guardianLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ClockIcon size={14} className="text-ink/40" />
          <div>
            <p className="font-mono text-[11px] text-ink/45 uppercase tracking-[0.22em]">Protection</p>
            <p className="font-mono text-xs text-ink/65">
              {contentType === 'walrus-file' ? renewalMode ?? 'notify' : timelockDelay}
            </p>
          </div>
        </div>
      </div>

      {contentType === 'walrus-file' && (
        <div className="mt-4 rounded-lg border border-slate-blue/30 bg-slate-blue/10 px-3 py-2.5">
          <p className="font-mono text-xs text-ink/70 truncate">{fileName ?? 'Encrypted file'}</p>
          <p className="text-xs text-ink/50">
            {walrusEndDate ? `Expires around ${formatDate(new Date(walrusEndDate).getTime())}` : 'Expiry pending'}
          </p>
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="font-mono text-[11px] text-ink/45 uppercase tracking-[0.22em]">Storage</p>
          <p className="font-mono text-xs text-ink/65">{storageLabel}</p>
        </div>
        <div>
          <p className="font-mono text-[11px] text-ink/45 uppercase tracking-[0.22em]">Encryption</p>
          <p className="font-mono text-xs text-ink/65">Encrypted before saving</p>
        </div>
        <div>
          <p className="font-mono text-[11px] text-ink/45 uppercase tracking-[0.22em]">Created</p>
          <p className="font-mono text-xs text-ink/65">{formatDate(createdAt)}</p>
        </div>
        <div>
          <p className="font-mono text-[11px] text-ink/45 uppercase tracking-[0.22em]">Details</p>
          <p className="font-mono text-xs text-ink/65 truncate">{ipfsCid ? 'Available in vault details' : 'Saved locally'}</p>
        </div>
      </div>
    </div>
  );
}
