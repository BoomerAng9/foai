import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to Destinations AI to resume your shortlist and intentions.',
};

export default function SignInPage() {
  return (
    <main
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: 'var(--stage)' }}
    >
      <Ambient />
      <Suspense fallback={null}>
        <AuthForm mode="sign-in" />
      </Suspense>
    </main>
  );
}

function Ambient() {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 30% 20%, rgba(255,107,0,0.12), transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(79,209,255,0.08), transparent 60%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-30"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
    </>
  );
}
