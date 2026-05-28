'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { KeyIcon, ShieldIcon } from '@/components/ui/Icons';

interface ShareCollectorProps {
  threshold: number;
  totalShares: number;
  onSharesCollected: (shares: string[]) => void;
}

interface ShareInput {
  id: string;
  value: string;
}

function isValidHexShare(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  // Remove optional 0x prefix
  const hex = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
  // Must be even length and only hex chars
  return hex.length > 0 && hex.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(hex);
}

let nextId = 0;
function createShareInput(): ShareInput {
  return { id: `share-${++nextId}`, value: '' };
}

export default function ShareCollector({
  threshold,
  totalShares,
  onSharesCollected,
}: ShareCollectorProps) {
  const [shares, setShares] = useState<ShareInput[]>(() => [createShareInput()]);

  const updateShare = useCallback((id: string, value: string) => {
    setShares((prev) => prev.map((s) => (s.id === id ? { ...s, value } : s)));
  }, []);

  const removeShare = useCallback((id: string) => {
    setShares((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  const addShare = useCallback(() => {
    setShares((prev) => {
      if (prev.length >= totalShares) return prev;
      return [...prev, createShareInput()];
    });
  }, [totalShares]);

  const validShares = useMemo(
    () => shares.filter((s) => isValidHexShare(s.value)),
    [shares]
  );

  const validCount = validShares.length;
  const canReconstruct = validCount >= threshold;
  const progressPercent = Math.min((validCount / threshold) * 100, 100);

  const handleReconstruct = () => {
    if (!canReconstruct) return;
    const hexStrings = validShares.map((s) => s.value.trim());
    onSharesCollected(hexStrings);
  };

  return (
    <div className="ny-panel p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-lg bg-violet-400/10 p-2.5 text-violet-200">
          <KeyIcon size={20} />
        </div>
        <div>
          <h3 className="ny-heading text-lg">
            Collect Recovery Shares
          </h3>
          <p className="mt-0.5 text-sm text-zinc-500">
            Paste Shamir secret shares to reconstruct your key
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs uppercase tracking-wider text-zinc-500">
            Shares Collected
          </span>
          <span className="font-mono text-sm font-medium text-zinc-200">
            {validCount}
            <span className="text-zinc-500"> / {threshold}</span>
            <span className="ml-1 text-xs text-zinc-600">({totalShares} total)</span>
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-violet-400 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {canReconstruct && (
          <p className="mt-2 flex items-center gap-1.5 font-mono text-xs text-emerald-300">
            <ShieldIcon size={12} />
            Threshold met — ready to reconstruct
          </p>
        )}
      </div>

      {/* Share Inputs */}
      <div className="space-y-3 mb-6">
        {shares.map((share, index) => {
          const valid = isValidHexShare(share.value);
          const hasInput = share.value.trim().length > 0;
          const invalid = hasInput && !valid;

          return (
            <div key={share.id} className="relative group">
              {/* Label */}
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor={share.id}
                  className="font-mono text-xs uppercase tracking-wider text-zinc-500"
                >
                  Share #{index + 1}
                </label>
                {shares.length > 1 && (
                  <button
                    onClick={() => removeShare(share.id)}
                    className="font-mono text-[11px] text-zinc-600 transition-colors hover:text-red-200"
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  id={share.id}
                  value={share.value}
                  onChange={(e) => updateShare(share.id, e.target.value)}
                  placeholder="Paste hex share (e.g. 0x1a2b3c...)"
                  rows={2}
                  className={`
                    w-full font-mono text-sm text-white
                    bg-black/20 border rounded-lg
                    px-4 py-3 pr-10
                    resize-none
                    placeholder:text-zinc-700
                    focus:outline-none focus:ring-2 focus:ring-offset-1
                    transition-all duration-200
                    ${
                      valid
                        ? 'border-emerald-300/40 focus:ring-emerald-300/30'
                        : invalid
                          ? 'border-red-300/40 focus:ring-red-300/30'
                          : 'border-white/10 focus:ring-violet-300/20'
                    }
                  `}
                />

                {/* Validation icon */}
                {hasInput && (
                  <div className="absolute right-3 top-3">
                    {valid ? (
                      <svg
                        width={16}
                        height={16}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-emerald-300"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg
                        width={16}
                        height={16}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-red-300"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    )}
                  </div>
                )}
              </div>

              {/* Validation message */}
              {invalid && (
                <p className="mt-1 font-mono text-[11px] text-red-200/80">
                  Invalid hex — must be even-length hexadecimal
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Add Share button */}
        <button
          onClick={addShare}
          disabled={shares.length >= totalShares}
          className="
            inline-flex items-center justify-center gap-2
            px-4 py-2.5 rounded-lg
            border border-dashed border-white/15
            font-mono text-sm text-zinc-500
            hover:border-violet-300/40 hover:text-violet-100
            disabled:opacity-30 disabled:cursor-not-allowed
            transition-all duration-200
          "
        >
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Share
        </button>

        {/* Reconstruct button */}
        <button
          onClick={handleReconstruct}
          disabled={!canReconstruct}
          className={`
            sm:ml-auto inline-flex items-center justify-center gap-2
            px-6 py-2.5 rounded-lg
            font-mono text-sm font-medium
            transition-all duration-300
            ${
              canReconstruct
                ? 'bg-violet-600 text-white hover:bg-violet-500 shadow-md shadow-violet-500/20'
                : 'bg-white/[0.04] text-zinc-600 cursor-not-allowed'
            }
          `}
        >
          <ShieldIcon size={14} />
          Reconstruct Key
        </button>
      </div>
    </div>
  );
}
