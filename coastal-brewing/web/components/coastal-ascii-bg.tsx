"use client";

import { motion } from "framer-motion";

const STORK_R = "~('>"; // wood stork flying right
const STORK_L = "<'(~"; // wood stork flying left

const PALM = `  )))
 ((((
  |||
  |||
 /|||\\`;

const W1 = "~  ~~  ~  ~~~  ~ ~~  ~  ~~  ~  ~~~  ~ ~~  ~  ~~  ~  ~~~  ~ ~~  ~  ~~  ~  ~~~  ~ ";
const W2 = " ~  ~~~  ~  ~~  ~  ~~~  ~ ~~  ~  ~~~  ~ ~~  ~  ~~~  ~  ~~  ~  ~~~  ~ ~~  ~  ~~ ";
const W3 = "~~  ~  ~~  ~~~  ~  ~~  ~  ~~  ~~~  ~  ~~  ~  ~~~  ~  ~~  ~~~  ~  ~~  ~  ~~~  ~~ ";

interface Stork {
  top: string;
  delay: number;
  duration: number;
  glyph: string;
  fromX: number;
  toX: number;
  size: number;
}

const storks: Stork[] = [
  { top: "9%",  delay: 0,  duration: 26, glyph: STORK_R, fromX: -160, toX: 2400, size: 12 },
  { top: "5%",  delay: 8,  duration: 33, glyph: STORK_L, fromX: 2400, toX: -160, size: 11 },
  { top: "16%", delay: 15, duration: 24, glyph: STORK_R, fromX: -160, toX: 2400, size: 10 },
  { top: "22%", delay: 21, duration: 30, glyph: STORK_R, fromX: -160, toX: 2400, size: 10 },
  { top: "12%", delay: 5,  duration: 38, glyph: STORK_L, fromX: 2400, toX: -160, size: 9  },
  { top: "28%", delay: 11, duration: 29, glyph: STORK_R, fromX: -160, toX: 2400, size: 11 },
];

interface Palm {
  bottom: string;
  side: "left" | "right";
  scale: number;
  delay: number;
  duration: number;
  initialAngle: number;
}

const palms: Palm[] = [
  { bottom: "22%", side: "left",  scale: 1.0, delay: 0.0, duration: 3.2, initialAngle: -4 },
  { bottom: "4%",  side: "left",  scale: 0.68, delay: 0.5, duration: 3.8, initialAngle: -3 },
  { bottom: "19%", side: "right", scale: 0.90, delay: 0.3, duration: 3.5, initialAngle:  4 },
  { bottom: "3%",  side: "right", scale: 0.62, delay: 0.7, duration: 4.1, initialAngle:  3 },
];

const waves = [
  { text: W1, dir: -1, dur: 20 },
  { text: W2, dir:  1, dur: 25 },
  { text: W3, dir: -1, dur: 16 },
];

export function CoastalAsciiBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none font-mono text-foreground/[0.085]"
      aria-hidden="true"
    >
      {/* Wood storks in flight */}
      {storks.map((s, i) => (
        <motion.div
          key={i}
          className="absolute left-0 whitespace-nowrap"
          style={{ top: s.top, fontSize: s.size }}
          animate={{ x: [s.fromX, s.toX] }}
          transition={{
            delay: s.delay,
            duration: s.duration,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {s.glyph}
        </motion.div>
      ))}

      {/* Palm trees — sway from base */}
      {palms.map((p, i) => (
        <motion.pre
          key={i}
          className="absolute leading-tight whitespace-pre origin-bottom"
          style={{
            bottom: p.bottom,
            [p.side]: "0.5rem",
            fontSize: `${p.scale * 0.6}rem`,
          }}
          animate={{ rotateZ: [p.initialAngle, -p.initialAngle, p.initialAngle] }}
          transition={{
            delay: p.delay,
            duration: p.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {PALM}
        </motion.pre>
      ))}

      {/* Ocean waves — bottom, gentle drift */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-[1.4] text-[0.62rem]">
        {waves.map((w, i) => (
          <motion.div
            key={i}
            className="whitespace-nowrap"
            animate={{ x: [0, w.dir * 55, 0] }}
            transition={{
              duration: w.dur,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {w.text + w.text}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
