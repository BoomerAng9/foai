'use client';

import { useState, useEffect } from 'react';

const VERBS = ['Deploy', 'Manage', 'Ship', 'Build', 'Launch', 'Create', 'Deliver', 'Automate'];

export function RolodexVerb() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(prev => (prev + 1) % VERBS.length);
        setVisible(true);
      }, 250);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-block relative overflow-hidden h-[1.2em] align-bottom">
      <span
        className="inline-block font-bold transition-all duration-300 ease-in-out"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(-100%)',
          opacity: visible ? 1 : 0,
        }}
      >
        {VERBS[index]}
      </span>
    </span>
  );
}
