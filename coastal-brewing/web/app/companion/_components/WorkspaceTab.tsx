"use client";
import * as React from "react";
import { getWorkspaceMe, type WorkspaceMe } from "@/lib/companionApi";

export function WorkspaceTab() {
  const [data, setData] = React.useState<WorkspaceMe | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    getWorkspaceMe()
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, []);

  if (err) return <p className="text-destructive text-sm">{err}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Tier</p>
        <p className="text-lg font-semibold">{data.is_paid_tier ? "Paid" : "Free"}</p>
      </div>

      {data.taskade_workspace_id ? (
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Your private workspace</p>
          <p className="text-sm">
            Your meeting notes, summaries, and mind-maps are organised in your
            private workspace — a second brain that stays yours.
          </p>
          <a
            href={`https://www.taskade.com/w/${data.taskade_workspace_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 px-4 py-2 bg-foreground text-background"
          >
            Open workspace →
          </a>
        </div>
      ) : data.is_paid_tier ? (
        <p className="text-sm text-muted-foreground">
          Workspace provisioning in progress — give it a minute and refresh.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          A private workspace comes with the Notes tier. Upgrade in Settings to activate yours.
        </p>
      )}
    </div>
  );
}
