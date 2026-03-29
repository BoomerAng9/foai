'use client';

import { SKILLS } from '@/lib/skills/registry';
import type { Skill } from '@/lib/skills/registry';

interface SkillsMenuProps {
  onSelect: (skill: Skill) => void;
  activeSkillId?: string | null;
}

export function SkillsMenu({ onSelect, activeSkillId }: SkillsMenuProps) {
  return (
    <div className="w-[320px] bg-bg-surface border border-border shadow-lg py-1.5 self-start max-h-[460px] overflow-y-auto">
      <div className="px-4 py-1.5 border-b border-border">
        <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-fg-tertiary">
          Skills
        </span>
        <span className="font-mono text-[9px] text-fg-ghost ml-2">
          Attach to sharpen focus
        </span>
      </div>
      {SKILLS.map(skill => (
        <button
          key={skill.id}
          onClick={() => onSelect(skill)}
          className={`w-full text-left px-4 py-3 hover:bg-bg-elevated transition-colors border-l-2 ${
            activeSkillId === skill.id
              ? 'border-signal-live bg-bg-elevated'
              : 'border-transparent'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold">{skill.name}</span>
            <span className="font-mono text-[9px] text-fg-ghost">{skill.alias}</span>
          </div>
          <div className="text-[11px] text-fg-tertiary mt-0.5">{skill.description}</div>
          <div className="text-[10px] text-fg-ghost mt-1 italic">&ldquo;{skill.whenToAsk}&rdquo;</div>
        </button>
      ))}
      {activeSkillId && (
        <div className="px-4 py-2 border-t border-border">
          <button
            onClick={() => onSelect({ id: '', name: '', alias: '', description: '', whenToAsk: '', triggers: [], givesYou: '', example: '', systemContext: '' })}
            className="font-mono text-[10px] text-fg-tertiary hover:text-fg transition-colors"
          >
            Clear active skill
          </button>
        </div>
      )}
    </div>
  );
}
