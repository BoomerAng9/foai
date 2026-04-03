export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="font-outfit text-4xl font-extrabold tracking-wider" style={{ color: '#D4A853' }}>
          PER<span style={{ color: '#C0C0C0', opacity: 0.6 }}>|</span>FORM
        </h1>
        <p className="text-sm text-white/40 font-mono mt-2 tracking-widest">
          SPORTS GRADING &amp; RANKING PLATFORM
        </p>
        <p className="text-white/20 text-xs font-mono mt-8">
          Launching NFL Draft Day — April 23, 2026
        </p>
      </div>
    </main>
  );
}
