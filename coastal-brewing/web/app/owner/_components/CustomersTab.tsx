"use client";
import * as React from "react";
import { ConfirmModal } from "./ConfirmModal";

type Customer = { id: string; email: string | null; created: number; metadata: Record<string, string> };

export function CustomersTab() {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [actionTarget, setActionTarget] = React.useState<{ id: string; action: "delete" } | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const fetchCustomers = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/v1/owner/customers?q=${encodeURIComponent(q)}`, { credentials: "include" });
      if (!r.ok) throw new Error(`status ${r.status}`);
      const data = await r.json();
      setCustomers(data.customers ?? []);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }, [q]);

  React.useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const onDelete = async () => {
    if (!actionTarget) return;
    try {
      const r = await fetch(`/api/v1/owner/customers/${actionTarget.id}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ confirmation_phrase: "CONFIRM CUSTOMER DELETE" }),
      });
      if (!r.ok) throw new Error(`status ${r.status}`);
      setActionTarget(null);
      await fetchCustomers();
    } catch (e) {
      setErr(String(e));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          placeholder="search email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="border bg-background px-2 py-1 text-sm flex-1"
        />
        <button onClick={fetchCustomers} className="px-3 py-1 border text-sm">Search</button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {err && <p className="text-destructive text-xs">{err}</p>}

      <table className="w-full text-sm">
        <thead className="border-b border-border text-xs uppercase tracking-widest text-muted-foreground">
          <tr>
            <th className="text-left py-2">ID</th>
            <th className="text-left py-2">Email</th>
            <th className="text-left py-2">Created</th>
            <th className="text-left py-2">Tier</th>
            <th className="text-right py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} className="border-b border-border/30">
              <td className="py-1 font-mono text-xs">{c.id}</td>
              <td className="py-1 text-xs">{c.email || "—"}</td>
              <td className="py-1 font-mono text-xs">{new Date(c.created * 1000).toISOString().split("T")[0]}</td>
              <td className="py-1 font-mono text-xs">{c.metadata?.tier ?? "—"}</td>
              <td className="py-1 text-right">
                <button onClick={() => setActionTarget({ id: c.id, action: "delete" })}
                  className="text-xs text-destructive hover:underline">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmModal
        open={actionTarget !== null}
        title={`Delete customer ${actionTarget?.id ?? ""}`}
        diff={<p>This calls stripe.Customer.delete — irreversible. Use only for test customers.</p>}
        requiredPhrase="CONFIRM CUSTOMER DELETE"
        onConfirm={onDelete}
        onCancel={() => setActionTarget(null)}
      />
    </div>
  );
}
