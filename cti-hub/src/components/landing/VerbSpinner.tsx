'use client';

import { useState, useEffect, useCallback } from 'react';

const VERBS = [
  'DEPLOY',
  'BUILD',
  'LAUNCH',
  'SHIP',
  'CREATE',
  'DESIGN',
  'ARCHITECT',
  'AUTOMATE',
  'ORCHESTRATE',
  'SCALE',
  'EXECUTE',
  'TRANSFORM',
  'ENGINEER',
  'CONSTRUCT',
  'FORGE',
  'COMPOSE',
  'ASSEMBLE',
  'CRAFT',
  'DEVELOP',
  'GENERATE',
  'PRODUCE',
  'ESTABLISH',
  'OPERATE',
  'ACTIVATE',
  'CONFIGURE',
  'PROVISION',
  'INITIALIZE',
  'BOOTSTRAP',
  'SPIN UP',
  'STAND UP',
  'WIRE',
  'CONNECT',
  'INTEGRATE',
  'PUBLISH',
  'RELEASE',
  'DELIVER',
  'DISPATCH',
  'MANIFEST',
  'MATERIALIZE',
  'REALIZE',
  'ACTUALIZE',
];

export function VerbSpinner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayVerb, setDisplayVerb] = useState(VERBS[0]);

  // Auto-cycle every 9 seconds
  useEffect(() => {
    if (isSpinning) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const next = (prev + 1) % VERBS.length;
        setDisplayVerb(VERBS[next]);
        return next;
      });
    }, 9000);
    return () => clearInterval(interval);
  }, [isSpinning]);

  // Click to spin randomly
  const handleClick = useCallback(() => {
    if (isSpinning) return;
    setIsSpinning(true);

    let spins = 0;
    const totalSpins = 12 + Math.floor(Math.random() * 8); // 12-20 rapid cycles
    const spinInterval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * VERBS.length);
      setDisplayVerb(VERBS[randomIdx]);
      spins++;

      if (spins >= totalSpins) {
        clearInterval(spinInterval);
        const finalIdx = Math.floor(Math.random() * VERBS.length);
        setCurrentIndex(finalIdx);
        setDisplayVerb(VERBS[finalIdx]);
        setIsSpinning(false);
      }
    }, 80);
  }, [isSpinning]);

  return (
    <button
      onClick={handleClick}
      className="relative inline cursor-pointer group"
      title="Click to spin"
    >
      <span
        className={`font-bold transition-all duration-200 ${
          isSpinning ? 'text-white blur-[1px]' : 'text-[#E8A020] hover:text-white'
        }`}
      >
        {displayVerb}
      </span>
      <span className="absolute -bottom-0.5 left-0 w-full h-px bg-[#E8A020]/40 group-hover:bg-[#E8A020] transition-colors" />
    </button>
  );
}
