'use client';

import { SKILLS, getSkillsByCategory } from '@/lib/skills/registry';
import type { Skill } from '@/lib/skills/registry';

interface SkillsMenuProps {
  onSelect: (skill: Skill) => void;
  activeSkillId?: string | null;
}

const CATEGORIES = [
  { id: 'business' as const, label: 'Business Operations' },
  { id: 'domain' as const, label: 'Domain Expertise' },
  { id: 'special' as const, label: 'Special Capabilities' },
];

export function SkillsMenu({ onSelect, activeSkillId }: SkillsMenuProps) {
  return (
    <div className="w-[320px] bg-bg-surface border border-border shadow-lg py-1.5 self-start max-h-[500px] overflow-y-auto">
      <div className="px-4 py-1.5 border-b border-border">
        <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-fg-tertiary">
          Skills
        </span>
        <span className="font-mono text-[9px] text-fg-ghost ml-2">
          {SKILLS.length} available
        </span>
      </div>

      {CATEGORIES.map(cat => {
        const skills = getSkillsByCategory(cat.id);
        if (skills.length === 0) return null;
        return (
          <div key={cat.id}>
            <div className="px-4 py-1.5 mt-1">
              <span className="font-mono text-[8px] font-semibold uppercase tracking-widest text-fg-ghost">
                {cat.label}
              </span>
            </div>
            {skills.map(skill => (
              <button
                key={skill.id}
                onClick={() => onSelect(skill)}
                className={`w-full text-left px-4 py-2.5 hover:bg-bg-elevated transition-colors border-l-2 ${
                  activeSkillId === skill.id
                    ? 'border-signal-live bg-bg-elevated'
                    : 'border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold">{skill.name}</span>
                  <span className="font-mono text-[9px] text-fg-ghost">{skill.alias}</span>
                </div>
                <div className="text-[10px] text-fg-tertiary mt-0.5">{skill.description}</div>
              </button>
            ))}
          </div>
        );
      })}

      {activeSkillId && (
        <div className="px-4 py-2 border-t border-border">
          <button
            onClick={() => onSelect({ id: '', name: '', alias: '', description: '', whenToAsk: '', triggers: [], givesYou: '', example: '', category: 'business', systemContext: '' })}
            className="font-mono text-[10px] text-fg-tertiary hover:text-fg transition-colors"
          >
            Clear active skill
          </button>
        </div>
      )}
    </div>
  );
}
