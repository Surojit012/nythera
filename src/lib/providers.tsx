'use client';

import { ReactNode, useState } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { storyAeneid } from '@/lib/wagmi';

export default function Web3Providers({
  children,
}: {
  children: ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    console.warn('Privy is disabled: NEXT_PUBLIC_PRIVY_APP_ID is missing.');
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#7C5CFF',
          landingHeader: 'Sign in to Nythera',
          loginMessage: 'Create a secure recovery account with email or a wallet.',
          showWalletLoginFirst: false,
        },
        loginMethods: ['email', 'wallet'],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
          showWalletUIs: true,
        },
        defaultChain: storyAeneid,
        supportedChains: [storyAeneid],
      }}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </PrivyProvider>
  );
}
