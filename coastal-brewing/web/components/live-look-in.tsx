"use client";
import * as React from "react";
import { Box, Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  liveLookIn,
  type LiveLookInSession,
  isLiveLookInEnabled,
} from "@/lib/live-look-in";

type Agent = "sales" | "marketing";

const AGENT_LABEL: Record<Agent, string> = {
  sales: "Sales",
  marketing: "Marketing",
};

/**
 * Live Look In trigger button — drops onto a TeamCard.
 *
 * If the feature flag is off, the button renders disabled with a "coming soon"
 * tooltip. If the flag is on, clicking opens a Dialog whose content negotiates
 * the best available viewing mode (live → fallback video → static portrait).
 */
export function LiveLookInTrigger({
  agent,
  size = "sm",
}: {
  agent: Agent;
  size?: "sm" | "default" | "lg";
}) {
  const enabled = isLiveLookInEnabled();

  if (!enabled) {
    return (
      <Button
        variant="ghost"
        size={size}
        disabled
        title="Live Look In coming soon — GPU provisioning in progress"
      >
        <Box className="h-3.5 w-3.5" /> 3D
      </Button>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size={size}>
          <Box className="h-3.5 w-3.5" /> 3D
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-hidden">
        <LiveLookInViewer agent={agent} />
      </DialogContent>
    </Dialog>
  );
}

/**
 * The viewer body — fetches a session, renders the best available mode.
 *
 * Modes:
 *  - "live"           → mounts viewer_url as iframe (Cosmos / Lyra / HeyGen)
 *  - "fallback_video" → loops the rendered Seedance 360° MP4
 *  - "static"         → still portrait + "queued" message
 *  - "disabled"       → "not enabled in this environment" (shouldn't reach here)
 */
export function LiveLookInViewer({ agent }: { agent: Agent }) {
  const [session, setSession] = React.useState<LiveLookInSession | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    liveLookIn
      .create(agent)
      .then((s) => {
        if (!cancelled) setSession(s);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
      if (session?.session_id) liveLookIn.end(session.session_id).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent]);

  return (
    <div className="bg-card">
      <DialogHeader className="border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15">
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <div>
            <DialogTitle>{AGENT_LABEL[agent]} · Live Look In</DialogTitle>
            <DialogDescription className="mt-0.5">
              {session?.provider ? (
                <>Powered by <code className="font-mono text-xs">{session.provider}</code></>
              ) : (
                <>3D / volumetric viewer · session-bound</>
              )}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="relative aspect-video bg-secondary">
        {error && <ViewerError detail={error} />}
        {!error && !session && <ViewerLoading />}
        {!error && session && <ViewerStage session={session} />}
      </div>

      {session?.message && (
        <div className="border-t border-border px-6 py-3">
          <p className="text-xs text-muted-foreground">{session.message}</p>
        </div>
      )}
    </div>
  );
}

function ViewerLoading() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-accent" />
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Provisioning session…
      </p>
    </div>
  );
}

function ViewerError({ detail }: { detail: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center">
      <p className="font-display text-base font-semibold">Live Look In unavailable</p>
      <p className="font-mono text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function ViewerStage({ session }: { session: LiveLookInSession }) {
  switch (session.mode) {
    case "live":
      return session.viewer_url ? (
        <iframe
          src={session.viewer_url}
          className="absolute inset-0 h-full w-full border-0"
          allow="autoplay; fullscreen; xr-spatial-tracking"
          title={`Live Look In · ${session.agent}`}
        />
      ) : (
        <ViewerError detail="Live mode reported but viewer_url missing." />
      );

    case "fallback_video":
      return session.viewer_url ? (
        <video
          src={session.viewer_url}
          poster={session.poster || undefined}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <ViewerStill poster={session.poster} mode="fallback_video" />
      );

    case "static":
      return <ViewerStill poster={session.poster} mode="static" />;

    case "disabled":
    default:
      return <ViewerStill poster={session.poster} mode="disabled" />;
  }
}

function ViewerStill({
  poster,
  mode,
}: {
  poster: string | null;
  mode: "static" | "fallback_video" | "disabled";
}) {
  return (
    <div className="absolute inset-0">
      {poster && (
        <img
          src={poster}
          alt="Agent portrait"
          className="absolute inset-0 h-full w-full object-cover opacity-80"
        />
      )}
      <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-background/95 via-background/40 to-transparent p-6">
        <Badge variant="outline" className={cn("font-mono", mode === "disabled" && "opacity-60")}>
          {mode === "disabled" ? "OFFLINE" : "QUEUED · GPU WARMING UP"}
        </Badge>
      </div>
    </div>
  );
}
