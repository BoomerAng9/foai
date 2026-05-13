"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { webauthnEnroll } from "@/lib/webauthn";

export default function EnrollPage() {
  return (
    <React.Suspense fallback={null}>
      <EnrollInner />
    </React.Suspense>
  );
}

function EnrollInner() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") || "";
  const [state, setState] = React.useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = React.useState("");

  async function go() {
    setState("loading");
    setError("");
    try {
      await webauthnEnroll(email);
      setState("done");
      setTimeout(() => router.push("/owner"), 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enrolment failed");
      setState("error");
    }
  }

  return (
    <main className="container py-12 max-w-md">
      <h1 className="text-2xl font-semibold mb-4">Enrol your passkey</h1>
      <p className="mb-6 text-sm">
        Touch your hardware key (or use your laptop&apos;s built-in fingerprint /
        face sensor) to register a passkey for <strong>{email || "(no email)"}</strong>.
      </p>
      <button
        onClick={go}
        disabled={state === "loading" || !email}
        className="px-4 py-2 bg-foreground text-background disabled:opacity-50"
      >
        {state === "loading" ? "Touch your key…" : "Enrol passkey"}
      </button>
      {state === "done" && <p className="mt-4 text-accent">Enrolled — redirecting…</p>}
      {state === "error" && <p className="mt-4 text-destructive text-sm">{error}</p>}
    </main>
  );
}
