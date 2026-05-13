"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Tabs } from "./_components/Tabs";
import { ActivityTab } from "./_components/ActivityTab";
import { PricingTab } from "./_components/PricingTab";
import { CustomersTab } from "./_components/CustomersTab";
import { NemoClawTab } from "./_components/NemoClawTab";
import { AuditTab } from "./_components/AuditTab";
import { CfgTab } from "./_components/CfgTab";

const TAB_LIST = [
  { id: "activity", label: "Activity", render: () => <ActivityTab /> },
  { id: "pricing", label: "Pricing", render: () => <PricingTab /> },
  { id: "customers", label: "Customers", render: () => <CustomersTab /> },
  { id: "nemoclaw", label: "NemoClaw", render: () => <NemoClawTab /> },
  { id: "audit", label: "Audit", render: () => <AuditTab /> },
  { id: "cfg", label: "Cfg", render: () => <CfgTab /> },
];

export default function OwnerConsolePage() {
  const router = useRouter();
  const [active, setActive] = React.useState("activity");
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    // Auth probe: hit /api/v1/owner/activity. If 401 → /auth/login.
    fetch("/api/v1/owner/activity?include_stripe=false", { credentials: "include" })
      .then((r) => {
        if (r.status === 401) {
          router.push("/auth/login?return=/owner");
          return;
        }
        if (r.status === 403) {
          router.push("/?owner_denied=1");
          return;
        }
        setReady(true);
      })
      .catch(() => router.push("/auth/login?return=/owner"));
  }, [router]);

  if (!ready) return <main className="container py-12">Checking owner session…</main>;

  return (
    <main className="container py-8">
      <h1 className="text-2xl font-semibold mb-4">Owner Console</h1>
      <Tabs tabs={TAB_LIST} active={active} onChange={setActive} />
      <div className="mt-6">
        {TAB_LIST.find((t) => t.id === active)?.render()}
      </div>
    </main>
  );
}
