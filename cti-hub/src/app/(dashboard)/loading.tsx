export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-6">
      <div className="w-40 h-40 relative">
        {/* Light mode: multiply blends white bg away */}
        <img
          src="/boomer-ang-loader.png"
          alt="Loading"
          className="w-full h-full object-contain animate-spin dark:hidden"
          style={{ animationDuration: '3s', animationTimingFunction: 'linear', mixBlendMode: 'multiply' }}
        />
        {/* Dark mode: screen blends white bg away on dark surfaces */}
        <img
          src="/boomer-ang-loader.png"
          alt="Loading"
          className="w-full h-full object-contain animate-spin hidden dark:block invert"
          style={{ animationDuration: '3s', animationTimingFunction: 'linear', mixBlendMode: 'screen' }}
        />
      </div>
      <p className="font-mono text-[11px] text-fg-ghost uppercase tracking-widest">
        Loading...
      </p>
    </div>
  );
}
