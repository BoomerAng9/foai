export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/spinner-boomerang.png"
          alt=""
          className="w-16 h-auto animate-spin"
          style={{ animationDuration: '2s', animationTimingFunction: 'ease-in-out' }}
        />
        <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-fg-ghost">
          Loading...
        </span>
      </div>
    </div>
  );
}
