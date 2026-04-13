'use client';

/**
 * ShareCard — Draft Report Card sharing component.
 * Preview OG image + share on X / copy link / download.
 */

import { useState } from 'react';
import type { DraftPick } from '@/lib/draft/types';

interface ShareCardProps {
  teamAbbr: string;
  teamName: string;
  grade: string;
  picks: DraftPick[];
  bestPick?: string;
  biggestReach?: string;
  simId: string;
}

function buildOgUrl(props: ShareCardProps): string {
  const params = new URLSearchParams();
  params.set('team', props.teamAbbr);
  params.set('grade', props.grade);
  params.set('picks', props.picks.slice(0, 3).map(p => p.player_name).join(','));
  if (props.bestPick) params.set('best', props.bestPick);
  if (props.biggestReach) params.set('reach', props.biggestReach);
  params.set('sim_id', props.simId);
  return `/api/draft/og?${params.toString()}`;
}

function buildShareText(props: ShareCardProps): string {
  const topPick = props.picks[0]?.player_name || 'unknown';
  return `My ${props.teamName} got a ${props.grade} in the 2026 NFL Draft simulation! Top pick: ${topPick}. Try it: perform.foai.cloud/draft`;
}

export function ShareCard(props: ShareCardProps) {
  const [copied, setCopied] = useState(false);
  const ogUrl = buildOgUrl(props);
  const shareText = buildShareText(props);
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  const shareOnX = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback: ignore */ }
  };

  const downloadImage = () => {
    const a = document.createElement('a');
    a.href = ogUrl;
    a.download = `perform-draft-${props.teamAbbr}-${props.grade}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* OG Image Preview */}
      <div className="relative aspect-[1200/630] bg-black/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ogUrl}
          alt={`${props.teamName} Draft Grade: ${props.grade}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Action buttons */}
      <div className="p-4 flex flex-wrap gap-2">
        <button
          onClick={shareOnX}
          className="flex items-center gap-2 px-4 py-2 text-[11px] font-bold tracking-wider uppercase rounded-lg transition-all hover:brightness-110"
          style={{ background: 'rgba(29,155,240,0.15)', color: '#1DA1F2', border: '1px solid rgba(29,155,240,0.3)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          Share on X
        </button>

        <button
          onClick={copyLink}
          className="flex items-center gap-2 px-4 py-2 text-[11px] font-bold tracking-wider uppercase rounded-lg transition-all hover:bg-white/10"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          {copied ? 'Copied!' : 'Copy Link'}
        </button>

        <button
          onClick={downloadImage}
          className="flex items-center gap-2 px-4 py-2 text-[11px] font-bold tracking-wider uppercase rounded-lg transition-all hover:bg-white/10"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </button>
      </div>
    </div>
  );
}

/** Mini share button for inline use within grade cards */
export function MiniShareButton({ teamAbbr, grade, simId }: { teamAbbr: string; grade: string; simId: string }) {
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/draft/results/${simId}` : '';
  const text = `${teamAbbr} got a ${grade} in my 2026 NFL Draft sim! perform.foai.cloud/draft`;

  const share = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  return (
    <button
      onClick={(e) => { e.stopPropagation(); share(); }}
      className="p-1.5 rounded-md transition-colors hover:bg-white/10"
      title="Share on X"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    </button>
  );
}
