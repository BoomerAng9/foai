'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './VerbSpinner.module.css';

const VERBS = [
  'Deploy','Manage','Ship','Build','Launch','Create','Deliver','Automate',
  'Scale','Monitor','Optimize','Integrate','Develop','Design','Test',
  'Analyze','Secure','Transform','Innovate','Accelerate','Streamline',
  'Orchestrate','Customize','Configure','Implement','Architect','Engineer',
  'Iterate','Collaborate','Visualize','Generate','Synthesize','Provision',
  'Migrate','Refactor','Debug','Compile','Execute','Validate','Publish',
  'Broadcast',
];

export function VerbSpinner() {
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayVerb, setDisplayVerb] = useState(() => VERBS[Math.floor(Math.random() * VERBS.length)]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isSpinning) {
        const idx = Math.floor(Math.random() * VERBS.length);
        setDisplayVerb(VERBS[idx]);
      }
    }, 9000);
    return () => clearInterval(interval);
  }, [isSpinning]);

  const handleClick = useCallback(() => {
    if (isSpinning) return;
    setIsSpinning(true);

    let spins = 0;
    const totalSpins = 12 + Math.floor(Math.random() * 8);
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
