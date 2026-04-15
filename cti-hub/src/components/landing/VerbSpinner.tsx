'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './VerbSpinner.module.css';

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
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayVerb, setDisplayVerb] = useState(VERBS[0]);

  // Auto-cycle every 9 seconds
  useEffect(() => {
    if (isSpinning) return;
    const interval = setInterval(() => {
      setDisplayVerb(prev => {
        const next = (VERBS.indexOf(prev) + 1) % VERBS.length;
        return VERBS[next];
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
        setDisplayVerb(VERBS[finalIdx]);
        setIsSpinning(false);
      }
    }, 80);
  }, [isSpinning]);

  const widthClass = (() => {
    const length = Math.min(11, Math.max(4, displayVerb.length));
    return styles[`w${length}` as keyof typeof styles] || styles.w11;
  })();

  return (
    <button
      onClick={handleClick}
      className={`${styles.button} ${widthClass}`}
      title="Click to spin"
    >
      <span
        className={`${styles.word} ${isSpinning ? styles.spinning : styles.idle}`}
      >
        {displayVerb}
      </span>
      <span className={styles.underline} />
    </button>
  );
}
