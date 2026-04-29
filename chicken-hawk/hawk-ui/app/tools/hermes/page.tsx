export const metadata = { title: 'Agent Runtime · Tool Chest' };

const channels = [
  { name: 'Telegram', status: 'live', direction: 'both' },
  { name: 'Slack', status: 'configurable', direction: 'both' },
  { name: 'Discord', status: 'configurable', direction: 'both' },
  { name: 'Email (SMTP)', status: 'configurable', direction: 'outbound' },
  { name: 'SMS (Twilio)', status: 'configurable', direction: 'both' },
];

export default function AgentRuntimePanel() {
  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Agent Runtime</h1>
        <p className="text-foai-muted mt-2">The execution shell behind every Chicken Hawk dispatch.</p>
      </header>

      <section className="rounded-xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6 mb-6">
        <h2 className="font-semibold text-lg mb-3">Channels</h2>
        <p className="text-sm text-foai-muted mb-4">Where the runtime can reach you for approvals + status.</p>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-foai-muted">
            <tr>
              <th className="text-left py-2">Channel</th>
              <th className="text-left py-2">Status</th>
              <th className="text-left py-2">Direction</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((c) => (
              <tr key={c.name} className="border-t border-foai-border/50">
                <td className="py-2">{c.name}</td>
                <td className="py-2">
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                      c.status === 'live' ? 'bg-foai-cyan/15 text-foai-cyan' : 'bg-white/10 text-foai-muted'
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="py-2 text-foai-muted">{c.direction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6 mb-6">
        <h2 className="font-semibold text-lg mb-3">Skills + MCP servers</h2>
        <p className="text-sm text-foai-muted mb-2">Capabilities the runtime can invoke.</p>
        <ul className="text-sm text-foai-muted space-y-1.5 list-disc pl-5">
          <li><span className="text-foai-text font-medium">Native MCP:</span> sequential-thinking · coastal-fs · memory · chicken-hawk</li>
          <li><span className="text-foai-text font-medium">Skills (curated):</span> rfp-intake · audit-ledger · live-task-plan · spinner-voice</li>
        </ul>
      </section>

      <section className="rounded-xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6">
        <h2 className="font-semibold text-lg mb-2">Approval flow</h2>
        <p className="text-sm text-foai-muted">
          Telegram-only for now. When the Policy Gate escalates, the runtime DMs the owner and you approve via inline buttons.
          In-GUI approval at this panel is on the roadmap.
        </p>
      </section>
    </>
  );
}
