"use client";
import * as React from "react";
import Image from "next/image";

interface TeamCardProps {
  id: string;
  display_name: string;
  function: string;
  pmo_label: string;
  story: string;
}

// 3D flip card — front shows portrait + name + function, back shows the
// character's bio extracted from their Inworld persona log
// (~/foai/aims-tools/voice-library/personas/<id>.md, Origin & Background
// section). Click / tap / Enter to flip. Uses inline CSS transforms so we
// don't depend on Tailwind plugin config.
export function TeamCard({ id, display_name, function: fn, pmo_label, story }: TeamCardProps) {
  const [flipped, setFlipped] = React.useState(false);
  return (
    <button
      type="button"
      onClick={() => setFlipped((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setFlipped((v) => !v);
        }
      }}
      aria-label={`${display_name} — ${flipped ? "show portrait" : "read bio"}`}
      aria-pressed={flipped}
      className="group relative block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-2xl"
      style={{ perspective: "1200px" }}
    >
      <div
        className="relative aspect-[3/4] w-full"
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 0.7s cubic-bezier(0.4, 0.0, 0.2, 1)",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* FRONT — portrait */}
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl border border-border/60 bg-secondary"
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
        >
          <Image
            src={`/team/${id}.png`}
            alt={`${display_name} — ${fn}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent/90">
              {pmo_label}
            </p>
            <p className="font-display text-lg font-semibold text-white">
              {display_name}
            </p>
            <p className="text-xs leading-relaxed text-white/80">{fn}</p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-white/60">
              tap to read bio →
            </p>
          </div>
        </div>

        {/* BACK — bio */}
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl border border-accent/40 bg-card"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="flex h-full flex-col p-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
              {pmo_label}
            </p>
            <h3 className="mt-2 font-display text-xl font-semibold tracking-tight text-foreground">
              {display_name}
            </h3>
            <p className="text-sm font-medium text-foreground/80">{fn}</p>
            <div className="mt-4 flex-1 overflow-y-auto">
              <p className="text-sm leading-relaxed text-foreground/90">
                {story}
              </p>
            </div>
            <p className="mt-3 font-mono text-[9px] uppercase tracking-widest text-muted-foreground/70">
              ← tap to flip back
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}
