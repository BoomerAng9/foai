'use client';

// Lightweight dot-grid canvas — the spirit of the sign-in-flow-1.tsx WebGL
// shader without the three.js bundle weight. Animated dots reveal radially
// from center on the email step, then collapse outward when the code completes.
// Spec doc's CanvasRevealEffect can be swapped in here later if we want the
// full GPU-shaded version; the API is the same.
import { useEffect, useRef } from 'react';

interface Props {
  reverse?: boolean;
  speed?: number;
  className?: string;
  color?: [number, number, number];
}

export function DotGridCanvas({
  reverse = false,
  speed = 1.0,
  className = '',
  color = [255, 107, 53], // foai-gold default; pass [20, 136, 252] for jet
}: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const start = performance.now();
    const dotSize = 3;
    const cellSize = 18;
    const [r, g, b] = color;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
    }

    function frame() {
      if (!ctx || !canvas) return;
      const t = (performance.now() - start) / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cols = Math.ceil(canvas.width / cellSize);
      const rows = Math.ceil(canvas.height / cellSize);
      const cx = cols / 2;
      const cy = rows / 2;
      const maxDist = Math.hypot(cx, cy);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const dx = i - cx;
          const dy = j - cy;
          const dist = Math.hypot(dx, dy);
          // Random-feeling but stable per-cell offset
          const seed = (Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1;
          const jitter = Math.abs(seed) * 0.18;

          let opacity: number;
          if (reverse) {
            // Outro: fade from edges inward
            const offset = (maxDist - dist) * 0.08 + jitter;
            const phase = t * speed - offset;
            opacity = Math.max(0, 1 - Math.min(1, phase * 1.4));
          } else {
            // Intro: bloom from center outward
            const offset = dist * 0.04 + jitter;
            const phase = t * speed - offset;
            opacity = Math.max(0, Math.min(1, phase * 1.4));
          }
          if (opacity < 0.02) continue;

          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.8})`;
          ctx.fillRect(i * cellSize, j * cellSize, dotSize, dotSize);
        }
      }
      rafId = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    rafId = requestAnimationFrame(frame);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafId);
    };
  }, [reverse, speed, color]);

  return <canvas ref={ref} className={`block w-full h-full ${className}`} />;
}
