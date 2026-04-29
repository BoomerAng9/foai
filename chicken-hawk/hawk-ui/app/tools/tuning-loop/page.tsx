export const metadata = { title: 'Tuning Loop · Tool Chest' };

export default function TuningLoopPanel() {
  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Tuning Loop</h1>
        <p className="text-foai-muted mt-2">Self-improvement engine. Tunes prompts, specialization, and routing against real workload outcomes.</p>
      </header>

      <Card title="Status" tone="soon">
        <p className="text-foai-muted mb-3">
          The autonomous-experiment engine isn't wired up yet. When it lands, this panel surfaces:
        </p>
        <ul className="space-y-2 text-sm text-foai-muted list-disc pl-5">
          <li>Active experiments — target metric, seed program, current iteration</li>
          <li>Kept vs. reverted history with metric deltas</li>
          <li>Overnight queue (~100 experiments / 8 hours)</li>
          <li>Surface area: prompt tuning · Lil_Hawk specialization · A/B routing · LoRA finetuning</li>
        </ul>
      </Card>

      <Card title="What this isn't">
        <p className="text-foai-muted">
          Not a research-citation lane. Not a web-search wrapper. Customer "research" or "fact-check" intents
          route through the Agent Runtime with web tools, not through this panel.
        </p>
      </Card>
    </>
  );
}

function Card({
  title,
  tone,
  children,
}: {
  title: string;
  tone?: 'live' | 'soon' | 'readonly';
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-lg">{title}</h2>
        {tone && (
          <span
            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
              tone === 'live'
                ? 'bg-foai-cyan/15 text-foai-cyan'
                : 'bg-foai-gold/15 text-foai-gold'
            }`}
          >
            {tone === 'live' ? 'Live' : tone === 'soon' ? 'Coming soon' : 'Read-only'}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
