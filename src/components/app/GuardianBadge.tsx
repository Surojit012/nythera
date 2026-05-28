'use client';

import React from 'react';
import { ClockIcon, UserIcon } from '@/components/ui/Icons';

type GuardianStatus = 'active' | 'pending' | 'offline';

interface GuardianBadgeProps {
  address: string;
  label: string;
  delay: string;
  status: GuardianStatus;
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const statusConfig: Record<GuardianStatus, { color: string; label: string }> = {
  active: { color: 'bg-emerald-300', label: 'Active' },
  pending: { color: 'bg-violet-300', label: 'Pending' },
  offline: { color: 'bg-ink/20', label: 'Offline' },
};

export default function GuardianBadge({ address, label, delay, status }: GuardianBadgeProps) {
  const statusInfo = statusConfig[status];

  return (
    <div className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-xl border border-offwhite/10 p-4 rounded-xl transition-all duration-200 hover:bg-white/10 hover:border-offwhite/20">
      {/* Avatar / Icon */}
      <div className="shrink-0 w-9 h-9 rounded-full bg-ink/40 flex items-center justify-center border border-offwhite/10">
        <UserIcon size={16} className="text-offwhite/40" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        {/* Address */}
        <p className="font-mono text-sm text-offwhite font-medium truncate">
          {truncateAddress(address)}
        </p>

        {/* Label + Delay */}
        <div className="flex items-center gap-2 mt-1">
          <span className="font-body text-xs text-offwhite/50">{label}</span>
          <span className="text-offwhite/20">·</span>
          <span className="inline-flex items-center gap-1">
            <ClockIcon size={10} className="text-offwhite/30" />
            <span className="font-mono text-[11px] text-offwhite/40">{delay}</span>
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="shrink-0 flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${statusInfo.color} ${
            status === 'active' ? 'animate-pulse-dot' : ''
          }`}
        />
        <span className="font-mono text-[11px] text-offwhite/40 uppercase tracking-wider">
          {statusInfo.label}
        </span>
      </div>
    </div>
  );
}
