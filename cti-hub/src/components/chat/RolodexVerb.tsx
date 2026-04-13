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
    <span
      className="inline transition-all duration-300 ease-in-out"
      style={{
        fontFamily: "'Permanent Marker', cursive",
        color: '#E8A020',
        fontSize: 'inherit',
        lineHeight: 'inherit',
        verticalAlign: 'baseline',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-4px)',
      }}
    >
      {VERBS[index]}
    </span>
  );
}
