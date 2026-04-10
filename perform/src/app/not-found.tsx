import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#0A0A0F' }}
    >
      <div className="max-w-md w-full text-center">
        <p
          className="font-outfit text-8xl font-black tracking-tight mb-2"
          style={{ color: 'rgba(212,168,83,0.2)' }}
        >
          404
        </p>

        <h1
          className="font-outfit text-2xl font-bold tracking-tight mb-3"
          style={{ color: '#D4A853' }}
        >
          Page not found
        </h1>

        <p className="text-sm font-mono text-white/40 mb-10 leading-relaxed">
          The page you are looking for does not exist or has been moved.
        </p>

        <Link
          href="/"
          className="inline-block px-6 py-2.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-colors"
          style={{
            background: 'rgba(212,168,83,0.15)',
            color: '#D4A853',
            border: '1px solid rgba(212,168,83,0.3)',
          }}
        >
          BACK TO HOME
        </Link>
      </div>
    </div>
  );
}
