"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Tabs } from "./_components/Tabs";
import { TranslationTab } from "./_components/TranslationTab";
import { ByokTab } from "./_components/ByokTab";
import { WorkspaceTab } from "./_components/WorkspaceTab";
import { TranscriptsTab } from "./_components/TranscriptsTab";
import { SettingsTab } from "./_components/SettingsTab";

const TAB_LIST = [
  { id: "translate", label: "Translate", render: () => <TranslationTab /> },
  { id: "byok", label: "BYOK key", render: () => <ByokTab /> },
  { id: "workspace", label: "Workspace", render: () => <WorkspaceTab /> },
  { id: "transcripts", label: "Transcripts", render: () => <TranscriptsTab /> },
  { id: "settings", label: "Settings", render: () => <SettingsTab /> },
];

export default function CompanionPage() {
  const router = useRouter();
  const [active, setActive] = React.useState("translate");
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/v1/companion/workspace/me", { credentials: "include" })
      .then((r) => {
        if (r.status === 401) {
          router.push("/auth/login?return=/companion");
          return;
        }
        setReady(true);
      })
      .catch(() => router.push("/auth/login?return=/companion"));
  }, [router]);

  if (!ready) return <main className="container py-12">Checking session…</main>;

  return (
    <main className="container py-8">
      <h1 className="text-2xl font-semibold mb-4">C|Brew Companion</h1>
      <Tabs tabs={TAB_LIST} active={active} onChange={setActive} />
      <div className="mt-6">
        {TAB_LIST.find((t) => t.id === active)?.render()}
      </div>
    </main>
  );
}
