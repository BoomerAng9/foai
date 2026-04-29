export const metadata = { title: 'Scheduled Jobs · Tool Chest' };

const schedules = [
  {
    name: 'Audit chain integrity check',
    cron: '0 */6 * * *',
    owner: 'Chicken Hawk',
    status: 'queued',
  },
  {
    name: 'Tuning Loop overnight run (~100 experiments)',
    cron: '0 1 * * *',
    owner: 'Chicken Hawk',
    status: 'awaiting engine',
  },
  {
    name: 'Lil_Hawk health probe',
    cron: '*/5 * * * *',
    owner: 'Chicken Hawk',
    status: 'queued',
  },
];

export default function CronPanel() {
  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Scheduled Jobs</h1>
        <p className="text-foai-muted mt-2">Cron-style recurring tasks owned by Chicken Hawk.</p>
      </header>

      <section className="rounded-xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6 mb-6">
        <h2 className="font-semibold text-lg mb-2">Status</h2>
        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-foai-gold/15 text-foai-gold">Read-only</span>
        <p className="text-sm text-foai-muted mt-3">
          Listing planned schedules. The runtime owns execution; create / pause / delete from this panel arrives next.
        </p>
      </section>

      <section className="rounded-xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6">
        <h2 className="font-semibold text-lg mb-3">Planned schedules</h2>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-foai-muted">
            <tr>
              <th className="text-left py-2">Name</th>
              <th className="text-left py-2">Schedule</th>
              <th className="text-left py-2">Owner</th>
              <th className="text-left py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.name} className="border-t border-foai-border/50">
                <td className="py-2">{s.name}</td>
                <td className="py-2">
                  <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-foai-bg text-foai-gold">{s.cron}</code>
                </td>
                <td className="py-2 text-foai-muted">{s.owner}</td>
                <td className="py-2">
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-foai-muted">
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
