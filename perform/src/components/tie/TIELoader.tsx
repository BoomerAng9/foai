'use client';

/**
 * TIE Engine Loader
 * ====================
 * Branded loading screen with the TIE Engine character (helmet + orange
 * jacket holding the TIE shield). Character slides in from the right
 * while the shield he holds spins, accompanied by "TIE IS NOW RUNNING"
 * with an animated dot pulse.
 *
 * Use as a route-level loading state for any page that pulls real
 * forecast data.
 */

import { motion } from 'framer-motion';
import Image from 'next/image';

interface TIELoaderProps {
  message?: string;
  subtitle?: string;
  fullScreen?: boolean;
}

export function TIELoader({
  message = 'TIE IS NOW RUNNING',
  subtitle = 'Calibrating the Talent & Innovation Engine',
  fullScreen = true,
}: TIELoaderProps) {
  return (
    <div
      className={`${fullScreen ? 'fixed inset-0 z-[9999]' : 'relative w-full min-h-[600px]'} flex items-center justify-center overflow-hidden`}
      style={{
        background:
          'radial-gradient(ellipse at center, #1A1108 0%, #0A0604 60%, #000000 100%)',
      }}
    >
      {/* Ambient gold radial glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(212,168,83,0.15) 0%, transparent 60%)',
        }}
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Animated diagonal gold stripes — subtle */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent, transparent 60px, #D4A853 60px, #D4A853 62px)',
        }}
      />

      <div className="relative flex flex-col items-center gap-10">
        {/* Character + spinning shield container */}
        <div className="relative w-[340px] h-[340px] flex items-center justify-center">
          {/* Spinning gold ring behind the character */}
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              border: '2px dashed rgba(212,168,83,0.35)',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-6 rounded-full pointer-events-none"
            style={{
              border: '1px solid rgba(212,168,83,0.18)',
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
          />

          {/* Character — slides in from right while shield spins */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ x: 200, opacity: 0, rotate: -8 }}
            animate={{ x: 0, opacity: 1, rotate: 0 }}
            transition={{
              duration: 0.9,
              ease: [0.2, 0.8, 0.2, 1],
              delay: 0.1,
            }}
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                filter:
                  'drop-shadow(0 0 30px rgba(212,168,83,0.45)) drop-shadow(0 16px 24px rgba(0,0,0,0.6))',
              }}
            >
              <Image
                src="/brand/tie-engine-character.png"
                alt="TIE Engine"
                width={320}
                height={320}
                className="object-contain"
                priority
                style={{ mixBlendMode: 'normal' }}
              />
            </motion.div>
          </motion.div>

          {/* Orbital sparkles */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full pointer-events-none"
              style={{
                background: '#FFD700',
                boxShadow: '0 0 6px #D4A853',
                top: '50%',
                left: '50%',
              }}
              animate={{
                x: [
                  Math.cos((i * Math.PI) / 3) * 160,
                  Math.cos(((i + 1) * Math.PI) / 3) * 160,
                  Math.cos(((i + 2) * Math.PI) / 3) * 160,
                ],
                y: [
                  Math.sin((i * Math.PI) / 3) * 160,
                  Math.sin(((i + 1) * Math.PI) / 3) * 160,
                  Math.sin(((i + 2) * Math.PI) / 3) * 160,
                ],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: i * 0.5,
                ease: 'linear',
              }}
            />
          ))}
        </div>

        {/* Headline */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <div className="flex items-center justify-center gap-2">
            <h1
              className="text-2xl md:text-3xl font-black tracking-[0.18em]"
              style={{
                color: '#D4A853',
                fontFamily: "'Outfit', sans-serif",
                textShadow:
                  '0 0 20px rgba(212,168,83,0.5), 0 2px 12px rgba(0,0,0,0.8)',
              }}
            >
              {message}
            </h1>
            <PulseDots />
          </div>
          <div
            className="text-xs md:text-sm mt-3 tracking-[0.15em]"
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {subtitle}
          </div>
        </motion.div>

        {/* Progress bar */}
        <motion.div
          className="w-[280px] h-[2px] rounded-full overflow-hidden"
          style={{ background: 'rgba(212,168,83,0.1)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background:
                'linear-gradient(90deg, transparent, #D4A853, #FFD700, #D4A853, transparent)',
            }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>
    </div>
  );
}

function PulseDots() {
  return (
    <span className="inline-flex items-center gap-1 ml-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: '#D4A853' }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'easeInOut',
          }}
        />
      ))}
    </span>
  );
}
