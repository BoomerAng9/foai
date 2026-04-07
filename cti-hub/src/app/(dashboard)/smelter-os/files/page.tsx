'use client';

/**
 * /smelter-os/files — Puter file tree browser
 * ==============================================
 * Read-only navigation of /smelter-os/ root. Click a directory to
 * descend. Click a file to preview its content inline. Breadcrumb
 * for navigating back up. Owner-only.
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { isOwner } from '@/lib/allowlist';

interface Entry {
  name: string;
  is_dir: boolean;
  size: number | null;
  modified: string | null;
}

interface DirResponse {
  path: string;
  entries: Entry[];
  count: number;
  error?: string;
}

interface FileResponse {
  path: string;
  size_bytes: number;
  content: string;
  truncated: boolean;
  error?: string;
}

export default function FilesPage() {
  const { user } = useAuth();
  const [path, setPath] = useState<string>('');
  const [dir, setDir] = useState<DirResponse | null>(null);
  const [file, setFile] = useState<FileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPath = useCallback(async (p: string, readFile = false) => {
    setLoading(true);
    setError(null);
    const qs = readFile ? `&read=1` : '';
    try {
      const res = await fetch(`/api/smelter-os/files?path=${encodeURIComponent(p)}${qs}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `HTTP ${res.status}`);
        setDir(null);
        setFile(null);
      } else if (readFile) {
        setFile(await res.json());
        setDir(null);
      } else {
        setDir(await res.json());
        setFile(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !isOwner(user.email)) return;
    fetchPath(path);
  }, [user, path, fetchPath]);

  if (!user || !isOwner(user.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050810' }}>
        <div className="text-[10px] font-mono text-white/50">Owner access required</div>
      </div>
    );
  }

  const segments = path.split('/').filter(Boolean);
  const breadcrumbs = [
    { label: 'root', path: '' },
    ...segments.map((seg, i) => ({
      label: seg,
      path: segments.slice(0, i + 1).join('/'),
    })),
  ];

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: 'radial-gradient(ellipse at top, #0B1220 0%, #050810 60%)',
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-10">
        <Link
          href="/smelter-os"
          className="text-[10px] font-mono tracking-[0.25em] opacity-60 hover:opacity-100 inline-block mb-6"
          style={{ color: '#ff5722' }}
        >
          ← SMELTEROS BRIDGE
        </Link>

        <div className="mb-8">
          <div className="text-[10px] font-mono tracking-[0.3em] mb-2" style={{ color: '#ff5722' }}>
            / FILES
          </div>
          <h1 className="text-4xl font-black tracking-tight">Puter File Tree</h1>
          <p className="text-sm mt-2" style={{ color: '#94A3B8' }}>
            Browse the <span className="font-mono">/smelter-os/</span> root. Click directories to
            descend, files to preview.
          </p>
        </div>

        {/* Breadcrumb */}
        <div
          className="flex items-center gap-2 mb-4 p-3 border overflow-x-auto whitespace-nowrap"
          style={{
            borderColor: 'rgba(255,87,34,0.2)',
            background: 'rgba(11,18,32,0.5)',
            borderRadius: '2px',
          }}
        >
          {breadcrumbs.map((bc, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] font-mono">
              {i > 0 && <span className="opacity-40">/</span>}
              <button
                onClick={() => setPath(bc.path)}
                className="hover:underline"
                style={{ color: i === breadcrumbs.length - 1 ? '#ff5722' : '#22D3EE' }}
              >
                {bc.label}
              </button>
            </div>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-[11px] font-mono opacity-50 py-8 text-center">Loading...</div>
        )}

        {/* Error */}
        {error && !loading && (
          <div
            className="p-4 border text-[11px] font-mono"
            style={{
              borderColor: 'rgba(239,68,68,0.4)',
              background: 'rgba(239,68,68,0.06)',
              color: '#FCA5A5',
              borderRadius: '2px',
            }}
          >
            {error.includes('PUTER_BASE_URL not configured') ? (
              <>
                <div className="font-bold mb-1">Puter not connected</div>
                <div className="opacity-80">
                  Set PUTER_BASE_URL and PUTER_API_KEY env vars on cti-hub, then redeploy. See{' '}
                  <span className="font-mono">smelter-os/sqwaadrun/deploy/BACKEND_WIRING.md</span>{' '}
                  for the full sequence.
                </div>
              </>
            ) : (
              <>Error: {error}</>
            )}
          </div>
        )}

        {/* Directory listing */}
        {!loading && dir && !error && (
          <div
            className="border overflow-hidden"
            style={{
              borderColor: 'rgba(255,87,34,0.2)',
              background: 'rgba(11,18,32,0.5)',
              borderRadius: '2px',
            }}
          >
            <div
              className="px-4 py-2 text-[9px] font-mono tracking-[0.2em] border-b opacity-60"
              style={{ borderColor: 'rgba(255,87,34,0.15)' }}
            >
              {dir.count} {dir.count === 1 ? 'entry' : 'entries'} in {dir.path}
            </div>
            {dir.entries.length === 0 ? (
              <div className="p-6 text-[11px] font-mono opacity-50 text-center">
                (empty directory)
              </div>
            ) : (
              <div>
                {dir.entries.map((e) => (
                  <button
                    key={e.name}
                    onClick={() => {
                      if (e.is_dir) {
                        setPath(path ? `${path}/${e.name}` : e.name);
                      } else {
                        fetchPath(path ? `${path}/${e.name}` : e.name, true);
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.04] transition border-b"
                    style={{ borderColor: 'rgba(255,87,34,0.08)' }}
                  >
                    <span className="text-base shrink-0">{e.is_dir ? '📁' : '📄'}</span>
                    <span
                      className="flex-1 text-[11px] font-mono truncate"
                      style={{ color: e.is_dir ? '#ff5722' : '#F1F5F9' }}
                    >
                      {e.name}
                    </span>
                    {e.size !== null && (
                      <span className="text-[10px] font-mono opacity-50 shrink-0">
                        {formatSize(e.size)}
                      </span>
                    )}
                    <span className="text-[10px] opacity-40 shrink-0">→</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* File preview */}
        {!loading && file && !error && (
          <div
            className="border"
            style={{
              borderColor: 'rgba(255,87,34,0.3)',
              background: 'rgba(11,18,32,0.6)',
              borderRadius: '2px',
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: 'rgba(255,87,34,0.15)' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span>📄</span>
                <span className="text-[11px] font-mono truncate" style={{ color: '#ff5722' }}>
                  {file.path}
                </span>
              </div>
              <div className="text-[9px] font-mono opacity-60 shrink-0">
                {formatSize(file.size_bytes)}
                {file.truncated && <span style={{ color: '#F97316' }}> · TRUNCATED</span>}
              </div>
            </div>
            <pre
              className="p-4 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-[600px]"
              style={{ color: '#E2E8F0' }}
            >
              {file.content || '(empty file)'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
