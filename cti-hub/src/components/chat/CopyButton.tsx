'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-bg-elevated"
      title="Copy"
    >
      {copied ? <Check className="w-3 h-3 text-signal-live" /> : <Copy className="w-3 h-3 text-fg-tertiary" />}
    </button>
  );
}
