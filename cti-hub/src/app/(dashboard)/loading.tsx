export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-6">
      <img
        src="/acheevy-deploy.png"
        alt="ACHEEVY Deploy"
        className="w-48 h-48 object-contain animate-pulse"
      />
      <p className="font-mono text-[11px] text-fg-ghost uppercase tracking-widest">
        Preparing your workspace...
      </p>
    </div>
  );
}
