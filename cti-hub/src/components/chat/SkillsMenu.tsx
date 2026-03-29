'use client';

import { SKILLS } from '@/lib/skills/registry';

interface SkillsMenuProps {
  onSelect: (prompt: string) => void;
}

export function SkillsMenu({ onSelect }: SkillsMenuProps) {
  return (
    <div className="w-[280px] bg-bg-surface border border-border shadow-lg py-1.5 self-start max-h-[360px] overflow-y-auto">
      <div className="px-4 py-1.5 border-b border-border">
        <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-fg-tertiary">
          Skills
        </span>
      </div>
      {SKILLS.map(skill => (
        <button
          key={skill.id}
          onClick={() => onSelect(skill.prompt)}
          className="w-full text-left px-4 py-2.5 hover:bg-bg-elevated transition-colors"
        >
          <div className="text-[13px] font-medium">{skill.name}</div>
          <div className="text-[11px] text-fg-tertiary mt-0.5">{skill.description}</div>
        </button>
      ))}
    </div>
  );
}
