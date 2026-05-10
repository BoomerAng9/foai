"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X } from "lucide-react";

import { cn } from "@/lib/utils";

interface AccountWelcomeCardProps {
  displayName: string;
  message: string;
  audioUrl?: string | null;
  motionUrl?: string;
  brandThesis?: string;
  autoDismissSec?: number;
  onDismiss: () => void;
}

const DEFAULT_MOTION_URL = "/welcome/coastal-welcome-motion.mp4";
const DEFAULT_BRAND_THESIS =
  "Coffee changes your day. We're here for the change.";

export function AccountWelcomeCard({
  displayName,
  message,
  audioUrl,
  motionUrl = DEFAULT_MOTION_URL,
  brandThesis = DEFAULT_BRAND_THESIS,
  autoDismissSec = 18,
  onDismiss,
}: AccountWelcomeCardProps) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [audioStarted, setAudioStarted] = React.useState(false);
  const [closing, setClosing] = React.useState(false);

  // Auto-dismiss timer
  React.useEffect(() => {
    const t = window.setTimeout(() => triggerDismiss(), autoDismissSec * 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDismissSec]);

  // Esc key to dismiss
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") triggerDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock body scroll while modal is open
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Start audio playback (browser autoplay policy may block — we
  // attempt and silently fall back if it does, since this lands
  // immediately after a user gesture (form submit) so it usually plays).
  React.useEffect(() => {
    if (!audioUrl) return;
    const a = audioRef.current;
    if (!a) return;
    const start = window.setTimeout(() => {
      a.play()
        .then(() => setAudioStarted(true))
        .catch(() => setAudioStarted(false));
    }, 600); // delay so the visual lands first
    return () => window.clearTimeout(start);
  }, [audioUrl]);

  function triggerDismiss() {
    if (closing) return;
    setClosing(true);
    audioRef.current?.pause();
    window.setTimeout(onDismiss, 400);
  }

  return (
    <AnimatePresence>
      {!closing && (
        <motion.div
          key="welcome-card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Welcome to Coastal Brewing Co."
        >
          {/* Motion background — universal Seedance clip */}
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover"
            poster="/coastal-brewing-co-storefront.png"
          >
            <source src={motionUrl} type="video/mp4" />
          </video>

          {/* Vignette layers — separate gradients give readable contrast
              without flattening the motion. Top fade keeps the close
              button legible; bottom fade anchors the text stack. */}
          <div className="absolute inset-0 bg-gradient-to-b from-foreground/30 via-transparent to-foreground/85" />
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]" />

          {/* Audio narration — invisible, autoplay-attempted */}
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              preload="auto"
              className="hidden"
              aria-hidden="true"
            />
          )}

          {/* Close button — top right */}
          <button
            type="button"
            onClick={triggerDismiss}
            aria-label="Dismiss welcome"
            className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center border border-background/20 bg-foreground/30 text-background backdrop-blur-sm transition-colors hover:bg-foreground/50 md:right-8 md:top-8"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Content stack — center, max-w-2xl */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.15,
                  delayChildren: 0.3,
                },
              },
            }}
            className="relative z-10 mx-auto max-w-2xl px-6 pb-16 text-center text-background md:pb-24"
          >
            <motion.p
              variants={fadeUp}
              className="font-mono text-[10px] uppercase tracking-[0.3em] text-background/80"
            >
              A toast to {displayName}
            </motion.p>

            <motion.h1
              variants={fadeUp}
              className="mt-5 font-display text-4xl font-semibold tracking-[-0.02em] leading-[1.05] md:text-6xl lg:text-7xl"
            >
              Pull up a stool.
              <span className="block text-background/75">Pour. Stay a while.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mx-auto mt-8 max-w-xl font-display text-lg leading-relaxed text-background/90 md:text-xl"
            >
              {message}
            </motion.p>

            <motion.p
              variants={fadeUp}
              className="mt-8 font-mono text-[10px] uppercase tracking-[0.3em] text-background/70 md:text-[11px]"
            >
              {brandThesis}
            </motion.p>

            <motion.div variants={fadeUp} className="mt-12 flex justify-center">
              <button
                type="button"
                onClick={triggerDismiss}
                className={cn(
                  "group inline-flex items-center gap-2 border border-background/40 bg-background px-7 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground",
                  "transition-colors hover:bg-foreground hover:text-background hover:border-background",
                )}
              >
                Pull up to the counter
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </motion.div>

            {/* Subtle "audio playing" indicator — only renders when
                narration successfully kicked off, so users know Sal is
                speaking even without scrubbing controls. */}
            {audioStarted && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-8 flex items-center justify-center gap-1.5"
                aria-hidden="true"
              >
                {[0, 1, 2, 3].map((i) => (
                  <motion.span
                    key={i}
                    className="block h-2.5 w-0.5 bg-background/60"
                    animate={{
                      scaleY: [0.4, 1, 0.4],
                    }}
                    transition={{
                      duration: 0.9,
                      repeat: Infinity,
                      delay: i * 0.12,
                    }}
                  />
                ))}
                <span className="ml-2 font-mono text-[9px] uppercase tracking-widest text-background/55">
                  Sal speaking
                </span>
              </motion.div>
            )}
          </motion.div>

          {/* Auto-dismiss progress — bottom edge, near-invisible scrub */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: autoDismissSec, ease: "linear" }}
            className="absolute bottom-0 left-0 right-0 h-px origin-left bg-background/40"
            aria-hidden="true"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};
