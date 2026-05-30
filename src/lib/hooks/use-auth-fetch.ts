'use client';

import { useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';

/**
 * Hook that returns an authenticated fetch function.
 * Automatically attaches the Privy access token as a Bearer header.
 * Falls back to a regular fetch if no token is available.
 */
export function useAuthFetch() {
  const { getAccessToken } = usePrivy();

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      let token: string | null = null;
      try {
        token = await getAccessToken();
      } catch {
        // If token retrieval fails, proceed without auth
      }

      const headers = new Headers(init?.headers);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      return fetch(input, { ...init, headers });
    },
    [getAccessToken],
  );

  return authFetch;
}
