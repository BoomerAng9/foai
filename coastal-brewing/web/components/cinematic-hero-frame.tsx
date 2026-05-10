"use client";

// Cinematic hero frame for Coastal Brewing Co. Replaces the static
// storefront image with a parallax-pinned canvas + kinetic-typography
// motto reveal. Owner directive 2026-05-06 — "build impressive and
// immersive designs yourself" (no scrollsequence.com subscription).
//
// Layer stack (back → front):
//   1. Storefront image — parallax-shifts on scroll (slower than viewport)
//   2. Vignette gradient — darkens edges so type reads
//   3. Motto wordmark — kinetic reveal (word-by-word fade-up on mount,
//      then scroll-driven scale + opacity recede so the rest of the
//      hero copy can take focus)
//   4. Sub-tagline — scroll-driven rise as the motto recedes
//
// Respects prefers-reduced-motion: animations short-circuit to static.

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

const MOTTO_WORDS = ["Nothing", "Chemically,", "Ever."];

export function CinematicHeroFrame() {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    // Animate while the frame travels from "below the fold" up through
    // "entirely past the viewport" — gives us the full scroll travel to
    // play with on a reasonably tall hero.
    offset: ["start start", "end start"],
  });

  // Parallax: image moves slower than scroll (down 0 → up 60px) so the
  // motto layered on top feels stationary while the world scrolls past.
  const imageY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, -60]);
  // Motto recedes as the user scrolls past first 40% of frame travel.
  const mottoOpacity = useTransform(scrollYProgress, [0, 0.35, 0.6], reduce ? [1, 1, 1] : [1, 0.85, 0]);
  const mottoScale = useTransform(scrollYProgress, [0, 0.6], reduce ? [1, 1] : [1, 0.85]);
  // Sub-tagline rises as motto recedes.
  const taglineOpacity = useTransform(scrollYProgress, [0.25, 0.5, 0.95], reduce ? [1, 1, 1] : [0, 1, 1]);
  const taglineY = useTransform(scrollYProgress, [0.25, 0.6], reduce ? [0, 0] : [16, 0]);

  return (
    <div
      ref={ref}
      className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg"
    >
      <motion.div className="absolute inset-0" style={{ y: imageY }}>
        <Image
          src="/coastal-brewing-co-storefront.png"
          alt="Coastal Brewing Co. storefront at sunset — wood-stork logo and 'Nothing chemically, ever.' on the window, Spanish moss draped from a live oak, palm tree and oil lamp at the curb, brick walkway."
          fill
          sizes="(max-width: 768px) 100vw, 60vw"
          className="object-cover scale-105"
          priority
        />
      </motion.div>

      {/* Vignette + warm gradient — pulls focus to the kinetic type. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/65" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.55)_100%)]" />

      {/* Kinetic motto — word-by-word reveal on mount. */}
      <motion.div
        className="absolute inset-x-0 top-[28%] flex flex-col items-center justify-start px-6 text-center"
        style={{ opacity: mottoOpacity, scale: mottoScale }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-200/80">
          Coastal Brewing Co.
        </p>
        <h2 className="mt-3 font-display text-[clamp(36px,7vw,84px)] font-semibold leading-[0.95] tracking-[-0.02em] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.6)]">
          {MOTTO_WORDS.map((word, i) => (
            <motion.span
              key={word}
              initial={reduce ? false : { opacity: 0, y: 28, filter: "blur(8px)" }}
              animate={reduce ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                duration: 0.9,
                delay: 0.12 + i * 0.18,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="inline-block whitespace-nowrap"
            >
              {word}
              {i < MOTTO_WORDS.length - 1 ? " " : ""}
            </motion.span>
          ))}
        </h2>
        <motion.div
          initial={reduce ? false : { opacity: 0, scaleX: 0 }}
          animate={reduce ? undefined : { opacity: 1, scaleX: 1 }}
          transition={{ duration: 1.1, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 h-px w-24 origin-center bg-gradient-to-r from-transparent via-amber-300/80 to-transparent"
        />
      </motion.div>

      {/* Sub-tagline rises into focus as the motto recedes on scroll. */}
      <motion.div
        className="absolute inset-x-0 bottom-7 px-6 text-center"
        style={{ opacity: taglineOpacity, y: taglineY }}
      >
        <p className="font-display text-[clamp(15px,1.6vw,20px)] text-white/95 drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)]">
          Coffee, tea, matcha &mdash; brewed honest, served by ACHEEVY.
        </p>
      </motion.div>

      {/* Scroll cue — gentle pulse, only visible when the user hasn't
          scrolled. Hidden on reduced motion. */}
      {!reduce && (
        <motion.div
          className="absolute bottom-3 right-4 hidden md:block"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.0, 0.7, 0.0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex flex-col items-center gap-1 text-[10px] uppercase tracking-widest text-white/70">
            <span>scroll</span>
            <span className="block h-3 w-px bg-white/60" />
          </div>
        </motion.div>
      )}
    </div>
  );
}
