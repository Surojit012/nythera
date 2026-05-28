import { isAddress } from 'viem';

export type ClassifiedRecipient =
  | { kind: 'email'; value: string }
  | { kind: 'address'; value: `0x${string}` }
  | { kind: 'invalid'; value: string; reason: string };

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function classifyRecipient(raw: string): ClassifiedRecipient {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: 'invalid', value: raw, reason: 'empty' };
  if (trimmed.length > 254) {
    return { kind: 'invalid', value: raw, reason: 'too long' };
  }
  if (isAddress(trimmed)) {
    return { kind: 'address', value: trimmed };
  }
  if (EMAIL_RE.test(trimmed)) {
    return { kind: 'email', value: trimmed.toLowerCase() };
  }
  return { kind: 'invalid', value: raw, reason: 'not a valid email or wallet address' };
}

export function dedupeAddresses(addresses: `0x${string}`[]): `0x${string}`[] {
  const seen = new Set<string>();
  const out: `0x${string}`[] = [];
  for (const address of addresses) {
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(address);
  }
  return out;
}
