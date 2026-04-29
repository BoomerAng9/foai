import type { Metadata } from 'next';
import { Permanent_Marker } from 'next/font/google';
import './globals.css';

// Permanent Marker — used ONLY on brand-words (DEPLOY, AUTOMATION, A.I.M.S.).
// Loaded under the CSS var `--ch-font-marker` so the .ch-brand-word utility
// in globals.css can pick it up without a Tailwind config round-trip.
const permanentMarker = Permanent_Marker({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--ch-font-marker',
});

export const metadata: Metadata = {
  title: 'Chicken Hawk',
  description:
    'A direct, capable AI helper. Chicken Hawk drafts, plans, and dispatches routine work — and pauses for your call on anything that matters.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${permanentMarker.variable}`} data-theme="chicken-hawk">
      <body className="bg-foai-bg text-foai-text font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
