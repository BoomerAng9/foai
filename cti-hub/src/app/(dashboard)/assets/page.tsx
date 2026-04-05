'use client';

import { useState, useEffect, useRef } from 'react';
import {
  FolderOpen,
  Image as ImageIcon,
  Music,
  FileText,
  Video,
  Puzzle,
  Trash2,
  Upload,
  X,
  Play,
  Pause,
} from 'lucide-react';

interface Asset {
  id: number;
  name: string;
  type: 'image' | 'audio' | 'doc' | 'video' | 'plug';
  url: string;
  size_bytes: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

const TYPE_FILTERS = ['All', 'Images', 'Audio', 'Docs', 'Video', 'Plugs'] as const;
const TYPE_MAP: Record<string, string> = {
  Images: 'image',
  Audio: 'audio',
  Docs: 'doc',
  Video: 'video',
  Plugs: 'plug',
};

const TYPE_ICONS: Record<string, typeof ImageIcon> = {
  image: ImageIcon,
  audio: Music,
  doc: FileText,
  video: Video,
  plug: Puzzle,
};

const TYPE_COLORS: Record<string, string> = {
  image: 'bg-blue-500/20 text-blue-400',
  audio: 'bg-purple-500/20 text-purple-400',
  doc: 'bg-green-500/20 text-green-400',
  video: 'bg-red-500/20 text-red-400',
  plug: 'bg-amber-500/20 text-amber-400',
};

function formatBytes(bytes: number): string {
  if (!bytes) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<typeof TYPE_FILTERS[number]>('All');
  const [preview, setPreview] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: '', type: 'image', url: '' });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaying, setAudioPlaying] = useState<number | null>(null);

  const fetchAssets = () => {
    const typeParam = filter !== 'All' ? `?type=${TYPE_MAP[filter]}` : '';
    fetch(`/api/assets${typeParam}`)
      .then(r => r.json())
      .then(d => setAssets(d.assets || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    fetchAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAssets(prev => prev.filter(a => a.id !== id));
        if (preview?.id === id) setPreview(null);
      }
    } catch { /* ignore */ }
    setDeleting(null);
  };

  const handleUpload = async () => {
    if (!uploadForm.name || !uploadForm.url) return;
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: uploadForm.name,
          type: uploadForm.type,
          url: uploadForm.url,
        }),
      });
      if (res.ok) {
        setUploadForm({ name: '', type: 'image', url: '' });
        setUploading(false);
        setLoading(true);
        fetchAssets();
      }
    } catch { /* ignore */ }
  };

  const toggleAudio = (asset: Asset) => {
    if (audioPlaying === asset.id) {
      audioRef.current?.pause();
      setAudioPlaying(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(asset.url);
      audioRef.current = audio;
      audio.play();
      audio.onended = () => setAudioPlaying(null);
      setAudioPlaying(asset.id);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <FolderOpen className="w-5 h-5 text-fg-tertiary" />
            <h1 className="text-xl sm:text-2xl font-light tracking-tight">
              <span className="font-bold">PLUG BIN</span>
            </h1>
          </div>
          <p className="label-mono">Store your assets here. Images, audio, docs, video, and plugs.</p>
          <p className="text-[9px] font-mono text-fg-ghost mt-1">Storage: based on your plan tier</p>
        </div>
        <button
          onClick={() => setUploading(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-bg text-xs font-mono font-semibold tracking-wide hover:opacity-90 transition-opacity"
        >
          <Upload className="w-3.5 h-3.5" /> SAVE ASSET
        </button>
      </div>

      {/* Upload Modal */}
      {uploading && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setUploading(false)}>
          <div className="bg-bg-surface border border-border p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-sm font-bold tracking-wide">SAVE NEW ASSET</h2>
              <button onClick={() => setUploading(false)} className="text-fg-tertiary hover:text-fg"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label-mono mb-1 block">Name</label>
                <input
                  value={uploadForm.name}
                  onChange={e => setUploadForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-bg border border-border px-3 py-2 text-sm font-mono text-fg focus:outline-none focus:border-accent"
                  placeholder="My image..."
                />
              </div>
              <div>
                <label className="label-mono mb-1 block">Type</label>
                <select
                  value={uploadForm.type}
                  onChange={e => setUploadForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full bg-bg border border-border px-3 py-2 text-sm font-mono text-fg focus:outline-none focus:border-accent"
                >
                  <option value="image">Image</option>
                  <option value="audio">Audio</option>
                  <option value="doc">Document</option>
                  <option value="video">Video</option>
                  <option value="plug">Plug</option>
                </select>
              </div>
              <div>
                <label className="label-mono mb-1 block">URL</label>
                <input
                  value={uploadForm.url}
                  onChange={e => setUploadForm(f => ({ ...f, url: e.target.value }))}
                  className="w-full bg-bg border border-border px-3 py-2 text-sm font-mono text-fg focus:outline-none focus:border-accent"
                  placeholder="https://..."
                />
              </div>
            </div>
            <button
              onClick={handleUpload}
              disabled={!uploadForm.name || !uploadForm.url}
              className="w-full py-2.5 bg-accent text-bg text-xs font-mono font-bold tracking-wide disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              SAVE
            </button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-bg-surface border border-border p-6 w-full max-w-2xl max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-mono text-sm font-bold tracking-wide truncate">{preview.name}</h2>
              <button onClick={() => setPreview(null)} className="text-fg-tertiary hover:text-fg"><X className="w-4 h-4" /></button>
            </div>
            {preview.type === 'image' && preview.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt={preview.name} className="w-full max-h-[60vh] object-contain bg-bg rounded" />
            )}
            {preview.type === 'audio' && preview.url && (
              <audio controls src={preview.url} className="w-full mt-2" />
            )}
            {preview.type === 'video' && preview.url && (
              <video controls src={preview.url} className="w-full max-h-[60vh] bg-bg rounded" />
            )}
            {(preview.type === 'doc' || preview.type === 'plug') && (
              <div className="text-sm text-fg-secondary font-mono p-4 bg-bg border border-border">
                <a href={preview.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline break-all">{preview.url || 'No URL'}</a>
              </div>
            )}
            <div className="flex items-center gap-4 mt-4 font-mono text-[10px] text-fg-tertiary">
              <span>{preview.type.toUpperCase()}</span>
              <span>{formatBytes(preview.size_bytes)}</span>
              <span>{formatDate(preview.created_at)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Type Filters */}
      <div className="flex items-center gap-1 flex-wrap">
        {TYPE_FILTERS.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 text-[11px] font-mono font-medium tracking-wide transition-colors ${
              filter === t
                ? 'bg-accent text-bg'
                : 'bg-bg-surface border border-border text-fg-secondary hover:text-fg hover:bg-bg-elevated'
            }`}
          >
            {t.toUpperCase()}
          </button>
        ))}
        <span className="ml-auto font-mono text-[10px] text-fg-tertiary">
          {assets.length} ASSET{assets.length !== 1 ? 'S' : ''}
        </span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="led bg-accent animate-pulse-dot mr-2" />
          <span className="font-mono text-xs text-fg-tertiary">Loading assets...</span>
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen className="w-10 h-10 text-fg-tertiary mb-4 opacity-40" />
          <p className="text-sm text-fg-secondary mb-1">No assets yet.</p>
          <p className="text-xs text-fg-tertiary font-mono">Create something in Chat or Broad|Cast to see it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {assets.map(asset => {
            const Icon = TYPE_ICONS[asset.type] || FileText;
            const colorClass = TYPE_COLORS[asset.type] || 'bg-gray-500/20 text-gray-400';
            return (
              <div
                key={asset.id}
                className="group bg-bg-surface border border-border hover:border-accent/40 transition-colors cursor-pointer"
                onClick={() => setPreview(asset)}
              >
                {/* Thumbnail area */}
                <div className="h-36 bg-bg flex items-center justify-center relative overflow-hidden">
                  {asset.type === 'image' && asset.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                  ) : asset.type === 'audio' ? (
                    <button
                      onClick={e => { e.stopPropagation(); toggleAudio(asset); }}
                      className="w-12 h-12 bg-bg-elevated border border-border flex items-center justify-center hover:border-accent transition-colors"
                    >
                      {audioPlaying === asset.id ? <Pause className="w-5 h-5 text-accent" /> : <Play className="w-5 h-5 text-fg-secondary" />}
                    </button>
                  ) : (
                    <Icon className="w-10 h-10 text-fg-tertiary opacity-40" />
                  )}
                  {/* Delete button */}
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(asset.id); }}
                    disabled={deleting === asset.id}
                    className="absolute top-2 right-2 w-7 h-7 bg-bg/80 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:border-red-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Info */}
                <div className="p-3 space-y-1.5">
                  <p className="text-xs font-medium truncate">{asset.name}</p>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-semibold tracking-wider ${colorClass}`}>
                      <Icon className="w-2.5 h-2.5" />
                      {asset.type.toUpperCase()}
                    </span>
                    <span className="font-mono text-[9px] text-fg-tertiary">{formatBytes(asset.size_bytes)}</span>
                  </div>
                  <p className="font-mono text-[9px] text-fg-tertiary">{formatDate(asset.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
