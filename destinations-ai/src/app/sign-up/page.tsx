import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Create your Destinations AI account to save destinations, stack intentions, and join region waitlists.',
};

export default function SignUpPage() {
  return (
    <main
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: 'var(--stage)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 30% 20%, rgba(255,107,0,0.12), transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(79,209,255,0.08), transparent 60%)',
        }}
      />
      <Suspense fallback={null}>
        <AuthForm mode="sign-up" />
      </Suspense>
    </main>
  );
}
