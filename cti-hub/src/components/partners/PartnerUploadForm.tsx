'use client';

/**
 * PartnerUploadForm — multi-file upload for a partner workspace
 * ================================================================
 * Drag-and-drop + file picker. Posts multipart/form-data to
 * /api/partners/[slug]/documents. On success, calls onUploaded so
 * the parent page can refetch the document list.
 */

import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { Upload, X, FileText, Loader2 } from 'lucide-react';

interface PartnerUploadFormProps {
  partnerSlug: string;
  onUploaded: () => void;
}

interface QueuedFile {
  file: File;
  id: string;
}

function formatBytes(n: number): string {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function PartnerUploadForm({
  partnerSlug,
  onUploaded,
}: PartnerUploadFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const addFiles = (list: FileList | File[]) => {
    const add: QueuedFile[] = [];
    for (const file of Array.from(list)) {
      if (file.size === 0) continue;
      add.push({
        file,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });
    }
    if (add.length > 0) {
      setQueue(prev => [...prev, ...add].slice(0, 20));
      setError(null);
      setSuccess(null);
    }
  };

  const removeFromQueue = (id: string) => {
    setQueue(prev => prev.filter(q => q.id !== id));
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFilePick = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
    }
  };

  const submit = async () => {
    if (queue.length === 0) return;
    setUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    for (const q of queue) {
      formData.append('file', q.file);
    }
    if (description) formData.append('description', description);
    if (tags) formData.append('tags', tags);

    try {
      const res = await fetch(`/api/partners/${partnerSlug}/documents`, {
        method: 'POST',
        body: formData,
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || `Upload failed (HTTP ${res.status})`);
      }
      const uploaded = body.uploaded?.length ?? 0;
      const failed = body.errors?.length ?? 0;
      if (uploaded > 0) {
        setSuccess(
          `${uploaded} file${uploaded === 1 ? '' : 's'} uploaded` +
            (failed > 0 ? ` · ${failed} failed` : ''),
        );
        setQueue([]);
        setDescription('');
        setTags('');
        onUploaded();
      } else {
        const firstErr = body.errors?.[0]?.error || 'Upload rejected';
        throw new Error(firstErr);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border border-border bg-bg-surface rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-fg-tertiary">
          Upload Documents
        </div>
        <div className="text-[10px] font-mono text-fg-tertiary">
          50 MB max · 20 files max
        </div>
      </div>

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-accent bg-accent/5'
            : 'border-border hover:border-accent/50 hover:bg-bg-elevated'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleFilePick}
          className="hidden"
          aria-label="Select files to upload"
        />
        <Upload className="w-6 h-6 text-fg-tertiary mx-auto mb-2" />
        <div className="text-xs font-mono text-fg-secondary">
          Drop files here or click to browse
        </div>
        <div className="text-[10px] font-mono text-fg-tertiary mt-1">
          Images, PDF, docs, audio, video
        </div>
      </div>

      {queue.length > 0 && (
        <div className="mt-3 space-y-1">
          {queue.map(q => (
            <div
              key={q.id}
              className="flex items-center justify-between gap-2 p-2 bg-bg-elevated border border-border rounded"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="w-3.5 h-3.5 text-fg-tertiary shrink-0" />
                <span className="text-xs font-mono text-fg truncate">
                  {q.file.name}
                </span>
                <span className="text-[10px] font-mono text-fg-tertiary shrink-0">
                  {formatBytes(q.file.size)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeFromQueue(q.id)}
                className="p-0.5 text-fg-tertiary hover:text-signal-error shrink-0"
                aria-label={`Remove ${q.file.name}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {queue.length > 0 && (
        <div className="mt-3 space-y-2">
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 text-xs font-mono bg-bg border border-border rounded focus:outline-none focus:border-accent transition-colors"
          />
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="Tags, comma-separated (optional)"
            className="w-full px-3 py-2 text-xs font-mono bg-bg border border-border rounded focus:outline-none focus:border-accent transition-colors"
          />
        </div>
      )}

      {error && (
        <div className="mt-3 p-2 bg-signal-error/10 border border-signal-error/40 rounded text-xs font-mono text-signal-error">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-3 p-2 bg-signal-live/10 border border-signal-live/40 rounded text-xs font-mono text-signal-live">
          {success}
        </div>
      )}

      {queue.length > 0 && (
        <button
          type="button"
          onClick={submit}
          disabled={uploading}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-accent text-bg text-xs font-mono font-bold tracking-wider uppercase rounded hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5" />
              Upload {queue.length} file{queue.length === 1 ? '' : 's'}
            </>
          )}
        </button>
      )}
    </div>
  );
}
