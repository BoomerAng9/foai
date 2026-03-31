'use client';

import { useState } from 'react';
import { NurdCard, DEFAULT_CARD, type NurdCardData } from '@/components/profile/NurdCard';
import { moderateText, moderateImagePrompt } from '@/lib/moderation/content-filter';
import { Save, AlertTriangle, Sparkles, Image } from 'lucide-react';

export default function ProfileCardPage() {
  const [card, setCard] = useState<NurdCardData>({ ...DEFAULT_CARD });
  const [editing, setEditing] = useState(false);
  const [moderationError, setModerationError] = useState('');
  const [avatarPrompt, setAvatarPrompt] = useState('');
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateField(field: keyof NurdCardData, value: string | number) {
    setModerationError('');
    if (typeof value === 'string') {
      const check = moderateText(value);
      if (!check.allowed) {
        setModerationError(check.reason || 'Content not allowed.');
        return;
      }
    }
    setCard(prev => ({ ...prev, [field]: value }));
  }

  async function handleGenerateAvatar() {
    if (!avatarPrompt.trim()) return;

    const check = moderateImagePrompt(avatarPrompt);
    if (!check.allowed) {
      setModerationError(check.reason || 'Prompt not allowed.');
      return;
    }

    setGeneratingAvatar(true);
    setModerationError('');
    try {
      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: avatarPrompt, style: 'illustration' }),
      });
      const data = await res.json();
      if (data.image) {
        setCard(prev => ({ ...prev, avatarUrl: data.image }));
      }
    } catch {
      setModerationError('Avatar generation failed. Try again.');
    } finally {
      setGeneratingAvatar(false);
    }
  }

  function handleSave() {
    // Full moderation check on all fields
    const fields = [card.name, card.class, card.coreTrait, card.vibeAbility, card.description];
    for (const field of fields) {
      const check = moderateText(field);
      if (!check.allowed) {
        setModerationError(`Content violation: ${check.reason}`);
        return;
      }
    }
    // TODO: Save to database
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-light tracking-tight mb-1">
          NURD <span className="font-bold">Profile Card</span>
        </h1>
        <p className="label-mono">Your identity on The Deploy Platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Preview */}
        <div>
          <p className="label-mono mb-3">Preview</p>
          <NurdCard data={card} editable={true} onEdit={() => setEditing(!editing)} />

          {/* Style Toggle */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setCard(prev => ({ ...prev, style: 'tech' }))}
              className={`flex-1 h-9 text-[10px] font-mono font-bold border transition-colors ${
                card.style === 'tech' ? 'bg-accent text-bg border-accent' : 'border-border text-fg-secondary hover:border-fg-ghost'
              }`}
            >
              TECH STYLE
            </button>
            <button
              onClick={() => setCard(prev => ({ ...prev, style: 'illustrated' }))}
              className={`flex-1 h-9 text-[10px] font-mono font-bold border transition-colors ${
                card.style === 'illustrated' ? 'bg-accent text-bg border-accent' : 'border-border text-fg-secondary hover:border-fg-ghost'
              }`}
            >
              ILLUSTRATED
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="space-y-4">
          <p className="label-mono">Customize</p>

          {moderationError && (
            <div className="flex items-center gap-2 p-3 bg-signal-error/10 border border-signal-error/20">
              <AlertTriangle className="w-4 h-4 text-signal-error shrink-0" />
              <p className="text-xs text-signal-error">{moderationError}</p>
            </div>
          )}

          {saved && (
            <div className="flex items-center gap-2 p-3 bg-signal-live/10 border border-signal-live/20">
              <Save className="w-4 h-4 text-signal-live" />
              <p className="text-xs text-signal-live">Card saved!</p>
            </div>
          )}

          <div>
            <label className="font-mono text-[10px] text-fg-ghost block mb-1">Name</label>
            <input value={card.name} onChange={e => updateField('name', e.target.value)} maxLength={30}
              className="input-field h-10 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[10px] text-fg-ghost block mb-1">Class</label>
              <input value={card.class} onChange={e => updateField('class', e.target.value)} maxLength={20}
                className="input-field h-10 text-sm" />
            </div>
            <div>
              <label className="font-mono text-[10px] text-fg-ghost block mb-1">Level</label>
              <input type="number" value={card.level} onChange={e => updateField('level', parseInt(e.target.value) || 1)} min={1} max={100}
                className="input-field h-10 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[10px] text-fg-ghost block mb-1">Core Trait</label>
              <input value={card.coreTrait} onChange={e => updateField('coreTrait', e.target.value)} maxLength={25}
                className="input-field h-10 text-sm" />
            </div>
            <div>
              <label className="font-mono text-[10px] text-fg-ghost block mb-1">Vibe Ability</label>
              <input value={card.vibeAbility} onChange={e => updateField('vibeAbility', e.target.value)} maxLength={25}
                className="input-field h-10 text-sm" />
            </div>
          </div>

          <div>
            <label className="font-mono text-[10px] text-fg-ghost block mb-1">Description</label>
            <textarea value={card.description} onChange={e => updateField('description', e.target.value)} maxLength={200} rows={3}
              className="input-field min-h-[80px] resize-none py-2 text-sm" />
          </div>

          {/* Avatar Generator */}
          <div className="border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Image className="w-4 h-4 text-accent" />
              <span className="font-mono text-[10px] font-bold text-accent">GENERATE AVATAR</span>
            </div>
            <div className="flex gap-2">
              <input
                value={avatarPrompt}
                onChange={e => setAvatarPrompt(e.target.value)}
                placeholder="Describe your avatar..."
                className="input-field h-9 text-xs flex-1"
              />
              <button
                onClick={handleGenerateAvatar}
                disabled={generatingAvatar || !avatarPrompt.trim()}
                className="btn-solid h-9 px-4 text-[10px] flex items-center gap-1.5 disabled:opacity-30"
              >
                {generatingAvatar ? (
                  <div className="w-3 h-3 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Sparkles className="w-3 h-3" /> Generate</>
                )}
              </button>
            </div>
          </div>

          <button onClick={handleSave} className="btn-solid w-full h-10 text-xs flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> Save Card
          </button>
        </div>
      </div>
    </div>
  );
}
