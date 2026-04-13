export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-6">
      <img
        src="/boomer-ang-loader.png"
        alt="Loading"
        className="w-40 animate-spin"
        style={{ animationDuration: '3s', animationTimingFunction: 'linear' }}
      />
      <p className="font-mono text-[11px] text-fg-ghost uppercase tracking-widest">
        Loading...
      </p>
    </div>
  );
}
