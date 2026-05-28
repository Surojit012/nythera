import type { Metadata } from 'next';
import { Bricolage_Grotesque, JetBrains_Mono, Poppins } from 'next/font/google';
import './globals.css';
import Web3Providers from '@/lib/providers';

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Nythera',
  description:
    'Nythera helps you save crypto recovery secrets in an encrypted vault that trusted people can recover if something happens to you.',
  keywords: [
    'wallet recovery',
    'seed phrase',
    'decentralized',
    'Web3',
    'guardian',
    'crypto security',
    'family crypto recovery',
  ],
  openGraph: {
    title: 'Nythera',
    description:
      'Encrypted recovery vaults for the crypto your family may need someday.',
    type: 'website',
    url: 'https://nythera.io',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nythera',
    description:
      'Encrypted recovery vaults for the crypto your family may need someday.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${bricolageGrotesque.variable} ${poppins.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen">
        <Web3Providers>{children}</Web3Providers>
      </body>
    </html>
  );
}
