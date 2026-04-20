import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://destinations.foai.cloud'),
  title: {
    default: 'Destinations AI',
    template: '%s · Destinations AI',
  },
  description:
    'Place-first discovery for where to live. Explore destinations, shortlist neighborhoods, and sign up for upcoming regions — by ACHIEVEMOR.',
  applicationName: 'Destinations AI',
  authors: [{ name: 'ACHIEVEMOR' }],
  keywords: [
    'destinations',
    'real estate',
    'relocation',
    'discovery',
    'walkability',
    'neighborhood',
    'ACHIEVEMOR',
  ],
  openGraph: {
    type: 'website',
    siteName: 'Destinations AI',
    title: 'Destinations AI — where do you want to live?',
    description:
      'Place-first discovery for relocation. Not properties — destinations.',
    url: 'https://destinations.foai.cloud',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Destinations AI',
    description:
      'Place-first discovery for relocation. Not properties — destinations.',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: { icon: '/favicon.ico' },
};

export const viewport: Viewport = {
  themeColor: '#0A0A0F',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
