import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chicken Hawk',
  description:
    'A direct, capable AI helper. Chicken Hawk drafts, plans, and dispatches routine work — and pauses for your call on anything that matters.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-foai-bg text-foai-text font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
