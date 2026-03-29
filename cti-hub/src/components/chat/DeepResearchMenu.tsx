'use client';

interface DeepResearchMenuProps {
  onSelect: (mode: 'search' | 'crawl' | 'extract') => void;
}

const OPTIONS = [
  { id: 'search' as const, name: 'Search', desc: 'Find sources and answers' },
  { id: 'crawl' as const, name: 'Crawl', desc: 'Extract content from a site' },
  { id: 'extract' as const, name: 'Extract', desc: 'Pull structured data from a page' },
];

export function DeepResearchMenu({ onSelect }: DeepResearchMenuProps) {
  return (
    <div className="w-[220px] bg-bg-surface border border-border shadow-lg py-1.5 self-start">
      <div className="px-4 py-1.5 border-b border-border">
        <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-fg-tertiary">
          Deep Research
        </span>
      </div>
      {OPTIONS.map(opt => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          className="w-full text-left px-4 py-2.5 hover:bg-bg-elevated transition-colors"
        >
          <div className="text-[13px] font-medium">{opt.name}</div>
          <div className="text-[11px] text-fg-tertiary mt-0.5">{opt.desc}</div>
        </button>
      ))}
    </div>
  );
}
