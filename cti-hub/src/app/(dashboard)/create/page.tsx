'use client';

import { useState } from 'react';
import { Video, Loader2, Play, RefreshCw, Download, Film, Layers, DollarSign } from 'lucide-react';

interface ShotPlan {
  scene_number: number;
  description: string;
  duration_seconds: number;
  camera: string;
  mood: string;
  transition: string;
  audio_note: string;
}

interface GeneratedShot {
  scene_number: number;
  status: string;
  generation_id?: string;
  video_url?: string;
  error?: string;
}

type Stage = 'brief' | 'planning' | 'review' | 'generating' | 'done';

export default function CreatePage() {
  const [brief, setBrief] = useState('');
  const [duration, setDuration] = useState(30);
  const [stage, setStage] = useState<Stage>('brief');
  const [shots, setShots] = useState<ShotPlan[]>([]);
  const [generatedShots, setGeneratedShots] = useState<GeneratedShot[]>([]);
  const [estimate, setEstimate] = useState<{ total_seconds: number; estimated_cost: number } | null>(null);
  const [error, setError] = useState('');

  async function planVideo() {
    if (!brief.trim()) return;
    setStage('planning'); setError('');

    try {
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, duration, action: 'plan' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShots(data.shots);
      setEstimate(data.estimate);
      setStage('review');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Planning failed');
      setStage('brief');
    }
  }

  async function generateAllShots() {
    setStage('generating');

    try {
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', shots }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setGeneratedShots(data.results);
      setStage('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setStage('review');
    }
  }

  async function regenerateShot(sceneNumber: number) {
    const shot = shots.find(s => s.scene_number === sceneNumber);
    if (!shot) return;

    setGeneratedShots(prev => prev.map(s =>
      s.scene_number === sceneNumber ? { ...s, status: 'generating' } : s
    ));

    try {
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate', shot }),
      });
      const data = await res.json();

      setGeneratedShots(prev => prev.map(s =>
        s.scene_number === sceneNumber ? { ...s, ...data, status: data.status || 'queued' } : s
      ));
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#A855F7]/10 flex items-center justify-center text-[#A855F7]">
          <Video className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create</h1>
          <p className="text-sm text-slate-500">Video, content, and asset generation</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Brief Input */}
      {stage === 'brief' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Video Brief</h2>
          <textarea
            value={brief} onChange={e => setBrief(e.target.value)} rows={4}
            placeholder="Describe your video... e.g. 'A 30-second ad for our workforce development program showing student success stories'"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#A855F7] resize-none"
          />
          <div className="flex items-center gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Duration</label>
              <select value={duration} onChange={e => setDuration(Number(e.target.value))}
                className="ml-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold">
                <option value={15}>15s</option>
                <option value={30}>30s</option>
                <option value={60}>60s</option>
              </select>
            </div>
            <button onClick={planVideo} disabled={!brief.trim()}
              className="ml-auto px-6 py-2.5 rounded-xl bg-[#A855F7] text-white text-sm font-bold hover:bg-[#9333EA] transition-all disabled:opacity-30 flex items-center gap-2 shadow-lg shadow-[#A855F7]/20">
              <Film className="w-4 h-4" /> Plan Shots
            </button>
          </div>
        </div>
      )}

      {/* Planning spinner */}
      {stage === 'planning' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <Loader2 className="w-8 h-8 text-[#A855F7] animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-600">Planning shot sequence...</p>
          <p className="text-xs text-slate-400 mt-1">Breaking your brief into individual scenes</p>
        </div>
      )}

      {/* Shot Review */}
      {(stage === 'review' || stage === 'generating' || stage === 'done') && shots.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" /> Shot Sequence ({shots.length} shots)
            </h2>
            {estimate && (
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{estimate.total_seconds}s total</span>
                <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> ${estimate.estimated_cost.toFixed(2)} estimated</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {shots.map(shot => {
              const generated = generatedShots.find(g => g.scene_number === shot.scene_number);
              return (
                <div key={shot.scene_number} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#A855F7] uppercase">Scene {shot.scene_number}</span>
                    <span className="text-[10px] text-slate-400">{shot.duration_seconds}s &middot; {shot.camera}</span>
                  </div>

                  {generated?.video_url ? (
                    <div className="aspect-video rounded-lg bg-slate-900 overflow-hidden relative">
                      <video src={generated.video_url} controls className="w-full h-full object-cover" />
                    </div>
                  ) : generated?.status === 'generating' || generated?.status === 'queued' ? (
                    <div className="aspect-video rounded-lg bg-slate-100 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-[#A855F7] animate-spin" />
                    </div>
                  ) : (
                    <div className="aspect-video rounded-lg bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center">
                      <Play className="w-6 h-6 text-slate-300" />
                    </div>
                  )}

                  <p className="text-[11px] text-slate-600 leading-relaxed">{shot.description}</p>
                  <div className="flex items-center gap-2 text-[9px] text-slate-400">
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded">{shot.mood}</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded">{shot.transition}</span>
                  </div>

                  {stage === 'done' && (
                    <button onClick={() => regenerateShot(shot.scene_number)}
                      className="w-full h-8 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-slate-200 transition-all">
                      <RefreshCw className="w-3 h-3" /> Regenerate
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {stage === 'review' && (
            <div className="flex justify-end gap-3">
              <button onClick={() => { setStage('brief'); setShots([]); }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50">
                Re-plan
              </button>
              <button onClick={generateAllShots}
                className="px-6 py-2.5 rounded-xl bg-[#A855F7] text-white text-sm font-bold hover:bg-[#9333EA] transition-all flex items-center gap-2 shadow-lg shadow-[#A855F7]/20">
                <Play className="w-4 h-4" /> Generate All Shots
              </button>
            </div>
          )}

          {stage === 'done' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-emerald-800">Video complete</p>
                <p className="text-xs text-emerald-600 mt-0.5">{shots.length} shots generated</p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-500">
                  <Download className="w-3.5 h-3.5" /> Full Video
                </button>
                <button className="px-4 py-2 rounded-lg bg-white border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-50">
                  <Layers className="w-3.5 h-3.5" /> All Segments
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
