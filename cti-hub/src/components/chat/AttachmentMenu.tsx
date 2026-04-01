'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Paperclip, Camera, Cloud, ArrowDownToLine, Github, BookOpen, Search, ChevronRight, Check, Languages,
} from 'lucide-react';
import type { TierId } from '@/lib/chat/types';
import { TIERS } from '@/lib/chat/types';
import { DeepResearchMenu } from './DeepResearchMenu';
import { SkillsMenu } from './SkillsMenu';
import type { Skill } from '@/lib/skills/registry';

interface AttachmentMenuProps {
  onFileSelect: () => void;
  onScreenshot: () => void;
  onDeepResearch: (mode: 'search' | 'crawl' | 'extract') => void;
  onSkillSelect: (skill: Skill) => void;
  activeSkillId: string | null;
  activeTier: TierId;
  onTierChange: (tier: TierId) => void;
  isSubscriber: boolean;
  grammarActive?: boolean;
  onGrammarToggle?: () => void;
}

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  hasSubmenu?: boolean;
  comingSoon?: boolean;
  dividerAfter?: boolean;
}

export function AttachmentMenu({
  onFileSelect,
  onScreenshot,
  onDeepResearch,
  onSkillSelect,
  activeSkillId,
  activeTier,
  onTierChange,
  isSubscriber,
  grammarActive,
  onGrammarToggle,
}: AttachmentMenuProps) {
  const [open, setOpen] = useState(false);
  const [showResearch, setShowResearch] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowResearch(false);
        setShowSkills(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleAction(action: () => void) {
    action();
    setOpen(false);
    setShowResearch(false);
    setShowSkills(false);
  }

  const menuItems: MenuItem[] = [
    {
      icon: <Languages className={`w-4 h-4 ${grammarActive ? 'text-accent' : 'text-fg-tertiary'}`} />,
      label: grammarActive ? 'Smart Translate ON ✓' : 'Smart Translate',
      onClick: () => { if (onGrammarToggle) onGrammarToggle(); setOpen(false); },
      dividerAfter: true,
    },
    {
      icon: <Paperclip className="w-4 h-4 text-fg-tertiary" />,
      label: 'Add files or photos',
      onClick: () => handleAction(onFileSelect),
    },
    {
      icon: <Camera className="w-4 h-4 text-fg-tertiary" />,
      label: 'Take a screenshot',
      onClick: () => handleAction(onScreenshot),
      dividerAfter: true,
    },
    {
      icon: <Cloud className="w-4 h-4 text-fg-tertiary" />,
      label: 'Google Drive',
      hasSubmenu: true,
      comingSoon: true,
    },
    {
      icon: <ArrowDownToLine className="w-4 h-4 text-fg-tertiary" />,
      label: 'Import / Migrate',
      hasSubmenu: true,
      comingSoon: true,
    },
    {
      icon: <Github className="w-4 h-4 text-fg-tertiary" />,
      label: 'GitHub',
      hasSubmenu: true,
      comingSoon: true,
      dividerAfter: true,
    },
    {
      icon: <BookOpen className="w-4 h-4 text-fg-tertiary" />,
      label: 'Skills',
      hasSubmenu: true,
      onClick: () => { setShowSkills(!showSkills); setShowResearch(false); },
    },
    {
      icon: <Search className="w-4 h-4 text-signal-info" />,
      label: 'Deep Research',
      hasSubmenu: true,
      onClick: () => setShowResearch(!showResearch),
    },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); setShowResearch(false); setShowSkills(false); }}
        className="btn-solid h-[44px] w-[44px] px-0 shrink-0 flex items-center justify-center text-lg font-light"
        title="Add content"
      >
        +
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 flex gap-2 z-50">
          <div className="w-[260px] bg-bg-surface border border-border shadow-lg py-1.5">
            {menuItems.map((item, i) => (
              <div key={i}>
                <button
                  onClick={item.onClick}
                  disabled={item.comingSoon}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                    item.comingSoon ? 'opacity-40 cursor-not-allowed' : 'hover:bg-bg-elevated'
                  } ${(item.label === 'Deep Research' && showResearch) || (item.label === 'Skills' && showSkills) ? 'bg-bg-elevated' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span className="text-[13px]">{item.label}</span>
                  </div>
                  {item.hasSubmenu && <ChevronRight className="w-3 h-3 text-fg-ghost" />}
                </button>
                {item.dividerAfter && <div className="h-px bg-border mx-0 my-1" />}
              </div>
            ))}

            <div className="h-px bg-border mx-0 my-1" />

            <div className="px-4 py-1.5">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-fg-tertiary">
                Execution Tier
              </span>
            </div>
            {TIERS.map(tier => (
              <button
                key={tier.id}
                onClick={() => { if (isSubscriber) onTierChange(tier.id); }}
                disabled={!isSubscriber}
                className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                  !isSubscriber ? 'opacity-40 cursor-not-allowed' : 'hover:bg-bg-elevated'
                } ${activeTier === tier.id ? 'bg-bg-elevated' : ''}`}
              >
                <span className="w-2 h-2" style={{ background: tier.color }} />
                <span className={`text-[13px] flex-1 ${activeTier === tier.id ? 'font-semibold' : ''}`}>
                  {tier.name}
                </span>
                {activeTier === tier.id && <Check className="w-3.5 h-3.5 text-signal-live" />}
              </button>
            ))}
          </div>

          {showResearch && (
            <DeepResearchMenu
              onSelect={(mode) => {
                onDeepResearch(mode);
                setOpen(false);
                setShowResearch(false);
              }}
            />
          )}
          {showSkills && (
            <SkillsMenu
              onSelect={(skill) => {
                onSkillSelect(skill);
                setOpen(false);
                setShowSkills(false);
              }}
              activeSkillId={activeSkillId}
            />
          )}
        </div>
      )}
    </div>
  );
}
