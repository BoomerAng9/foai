'use client';

import { useState, useEffect } from 'react';
import styles from './RolodexVerb.module.css';

const VERBS = ['Deploy', 'Manage', 'Ship', 'Build', 'Launch', 'Create', 'Deliver', 'Automate'];

export function RolodexVerb() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const interval = setInterval(() => {
      setVisible(false);
      timeoutId = setTimeout(() => {
        setIndex(prev => (prev + 1) % VERBS.length);
        setVisible(true);
      }, 250);
    }, 4000);
    return () => {
      clearInterval(interval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const widthClass = (() => {
    const length = Math.min(8, Math.max(4, VERBS[index].length));
    return styles[`w${length}` as keyof typeof styles] || styles.w8;
  })();

  return (
    <span className={`${styles.root} ${widthClass} ${visible ? styles.visible : styles.hidden}`}>
      {VERBS[index]}
    </span>
  );
}
