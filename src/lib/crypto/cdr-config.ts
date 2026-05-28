export const CDR_DEFAULTS = {
  network: (process.env.NEXT_PUBLIC_CDR_NETWORK as 'testnet' | 'mainnet') ?? 'testnet',
  rpcUrl: process.env.NEXT_PUBLIC_CDR_RPC_URL ?? 'https://aeneid.storyrpc.io',
  apiUrl: process.env.NEXT_PUBLIC_CDR_API_URL ?? '/api/cdr',
};

export function isHexAddress(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}
