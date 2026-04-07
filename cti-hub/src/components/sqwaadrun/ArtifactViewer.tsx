'use client';

/**
 * ArtifactViewer — tabbed output for a single scrape artifact
 * ==============================================================
 * Tabs: Raw Markdown / Links / Images / Structured Data / Meta
 *
 * Security:
 *   - All URLs from scraped content are scheme-validated before
 *     being rendered as hrefs or image srcs. Unsafe URLs render as
 *     inert text with a warning label — no javascript: injection.
 *   - Images are capped at DEFAULT_IMAGE_CAP per tab to prevent
 *     fetch storms against third-party origins. "Show all" expander
 *     available.
 *
 * Sqwaadrun brand palette — matches /plug/sqwaadrun and /sqwaadrun.
 */

import { useMemo, useState } from 'react';

const DEFAULT_IMAGE_CAP = 20;

export interface ArtifactData {
  id: number;
  url: string;
  content_hash: string | null;
  source_domain: string;
  status_code: number | null;
  title: string | null;
  meta_description: string | null;
  markdown: string | null;
  markdown_truncated?: boolean;
  clean_text: string | null;
  clean_text_truncated?: boolean;
  links: unknown[];
  images: unknown[];
  structured_data: Record<string, unknown>;
  gcs_html_path: string | null;
  scraped_at: string;
}

interface Props {
  artifact: ArtifactData;
}

type TabId = 'markdown' | 'links' | 'images' | 'structured' | 'meta';

const TABS: { id: TabId; label: string; color: string }[] = [
  { id: 'markdown', label: 'RAW MARKDOWN', color: '#F5A623' },
  { id: 'links', label: 'LINKS', color: '#22D3EE' },
  { id: 'images', label: 'IMAGES', color: '#F97316' },
  { id: 'structured', label: 'STRUCTURED', color: '#E91E63' },
  { id: 'meta', label: 'META', color: '#94A3B8' },
];

/**
 * Reject anything that isn't a normal web URL. Blocks javascript:,
 * data:, file:, vbscript:, etc. — all potential XSS vectors in
 * scraped hrefs.
 */
function isSafeUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string' || raw.length === 0) return false;
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function ArtifactViewer({ artifact }: Props) {
  const [tab, setTab] = useState<TabId>('markdown');
  const [copied, setCopied] = useState<string | null>(null);
  const [showAllImages, setShowAllImages] = useState(false);

  const headerUrlSafe = isSafeUrl(artifact.url);

  const linkList = useMemo(() => {
    if (!Array.isArray(artifact.links)) return [];
    return artifact.links
      .map((l) => {
        let href = '';
        let text = '';
        if (typeof l === 'string') {
          href = l;
          text = l;
        } else if (l && typeof l === 'object') {
          const obj = l as Record<string, unknown>;
          href = String(obj.href || obj.url || '');
          text = String(obj.text || obj.title || obj.href || obj.url || '');
        }
        return { href, text, safe: isSafeUrl(href) };
      })
      .filter((l) => l.href);
  }, [artifact.links]);

  const imageList = useMemo(() => {
    if (!Array.isArray(artifact.images)) return [];
    return artifact.images
      .map((i) => {
        let src = '';
        let alt = '';
        if (typeof i === 'string') {
          src = i;
        } else if (i && typeof i === 'object') {
          const obj = i as Record<string, unknown>;
          src = String(obj.src || obj.url || '');
          alt = String(obj.alt || '');
        }
        return { src, alt, safe: isSafeUrl(src) };
      })
      .filter((i) => i.src);
  }, [artifact.images]);

  const visibleImages = showAllImages
    ? imageList
    : imageList.slice(0, DEFAULT_IMAGE_CAP);
  const hiddenImageCount = imageList.length - visibleImages.length;

  const structuredJson = useMemo(
    () => JSON.stringify(artifact.structured_data || {}, null, 2),
    [artifact.structured_data],
  );

  async function copyText(text: string, key: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for HTTP origins and older browsers
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(`${key}_fail`);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(artifact, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.source_domain}-${artifact.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const activeTabMeta = TABS.find((t) => t.id === tab)!;

  return (
    <div
      className="border overflow-hidden"
      style={{
        borderColor: 'rgba(245,166,35,0.3)',
        background: 'rgba(11,18,32,0.6)',
        borderRadius: '3px',
      }}
    >
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'rgba(245,166,35,0.2)' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-mono tracking-[0.2em] opacity-60 mb-1">
              {artifact.source_domain} · STATUS {artifact.status_code || '—'}
            </div>
            <div className="text-sm font-bold text-white truncate">
              {artifact.title || '(untitled)'}
            </div>
            {headerUrlSafe ? (
              <a
                href={artifact.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono truncate block mt-0.5 hover:underline"
                style={{ color: '#22D3EE' }}
              >
                {artifact.url}
              </a>
            ) : (
              <span
                className="text-[10px] font-mono truncate block mt-0.5 opacity-60"
                style={{ color: '#F97316' }}
                title="Blocked: unsupported URL scheme"
              >
                ⚠ {artifact.url}
              </span>
            )}
          </div>
          <button
            onClick={downloadJson}
            className="text-[9px] font-mono tracking-wider px-2.5 py-1.5 shrink-0"
            style={{
              border: '1px solid rgba(245,166,35,0.4)',
              color: '#F5A623',
              borderRadius: '2px',
            }}
          >
            DOWNLOAD JSON
          </button>
        </div>
        {artifact.meta_description && (
          <div className="text-[11px] mt-2 opacity-70 leading-snug" style={{ color: '#CBD5E1' }}>
            {artifact.meta_description}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div
        className="flex items-center border-b overflow-x-auto"
        style={{ borderColor: 'rgba(245,166,35,0.15)' }}
      >
        {TABS.map((t) => {
          const isActive = t.id === tab;
          const count = countForTab(t.id, artifact, linkList, imageList);
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2.5 text-[10px] font-mono tracking-[0.2em] font-bold whitespace-nowrap transition"
              style={{
                color: isActive ? t.color : 'rgba(148,163,184,0.6)',
                borderBottom: isActive ? `2px solid ${t.color}` : '2px solid transparent',
                background: isActive ? `${t.color}08` : 'transparent',
              }}
            >
              {t.label}
              {count !== null && (
                <span className="ml-1.5 opacity-60">{count}</span>
              )}
            </button>
          );
        })}

        <div className="ml-auto pr-3">
          <button
            onClick={() =>
              copyText(contentForTab(tab, artifact, linkList, imageList, structuredJson), tab)
            }
            className="text-[9px] font-mono tracking-wider opacity-60 hover:opacity-100"
            style={{ color: activeTabMeta.color }}
          >
            {copied === tab
              ? '✓ COPIED'
              : copied === `${tab}_fail`
              ? '⚠ COPY FAILED'
              : 'COPY'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 max-h-[500px] overflow-y-auto">
        {tab === 'markdown' && (
          <>
            <pre
              className="text-[11px] leading-relaxed whitespace-pre-wrap font-mono"
              style={{ color: '#E2E8F0' }}
            >
              {artifact.markdown || artifact.clean_text || '(no content)'}
            </pre>
            {(artifact.markdown_truncated || artifact.clean_text_truncated) && (
              <div
                className="mt-3 text-[10px] font-mono opacity-60 p-2 border-l-2"
                style={{ borderColor: '#F5A623', color: '#F5A623' }}
              >
                ⚠ Content truncated to 50,000 characters. Download JSON for full body.
              </div>
            )}
          </>
        )}

        {tab === 'links' && (
          <>
            {linkList.length === 0 && (
              <div className="text-[11px] font-mono opacity-50">No links extracted.</div>
            )}
            <div className="space-y-1">
              {linkList.map((l, i) => (
                <div key={i} className="flex items-baseline gap-2 text-[11px]">
                  <span className="opacity-40 font-mono shrink-0 w-8 text-right">{i + 1}</span>
                  {l.safe ? (
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate hover:underline"
                      style={{ color: '#22D3EE' }}
                    >
                      {l.text}
                    </a>
                  ) : (
                    <span
                      className="truncate opacity-60"
                      style={{ color: '#F97316' }}
                      title="Blocked: unsupported URL scheme"
                    >
                      ⚠ {l.text}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'images' && (
          <>
            {imageList.length === 0 && (
              <div className="text-[11px] font-mono opacity-50">No images extracted.</div>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {visibleImages.map((img, i) =>
                img.safe ? (
                  <a
                    key={i}
                    href={img.src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border"
                    style={{ borderColor: 'rgba(245,166,35,0.2)', borderRadius: '2px' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.src}
                      alt={img.alt}
                      loading="lazy"
                      className="w-full h-20 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = '0.2';
                      }}
                    />
                  </a>
                ) : (
                  <div
                    key={i}
                    className="border flex items-center justify-center text-[9px] font-mono opacity-60 h-20"
                    style={{
                      borderColor: '#F9731640',
                      color: '#F97316',
                      borderRadius: '2px',
                    }}
                    title="Blocked: unsupported URL scheme"
                  >
                    ⚠ BLOCKED
                  </div>
                ),
              )}
            </div>

            {hiddenImageCount > 0 && (
              <div className="mt-3 flex items-center justify-between text-[10px] font-mono">
                <span className="opacity-60">
                  Showing {visibleImages.length} of {imageList.length} — {hiddenImageCount} hidden
                  to prevent fetch storms
                </span>
                <button
                  onClick={() => setShowAllImages(true)}
                  className="px-2 py-1 font-bold"
                  style={{
                    color: '#F97316',
                    border: '1px solid rgba(249,115,22,0.4)',
                    borderRadius: '2px',
                  }}
                >
                  SHOW ALL {imageList.length} →
                </button>
              </div>
            )}
          </>
        )}

        {tab === 'structured' && (
          <pre
            className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap"
            style={{ color: '#E2E8F0' }}
          >
            {structuredJson === '{}' ? '(no structured data)' : structuredJson}
          </pre>
        )}

        {tab === 'meta' && (
          <dl className="text-[11px] font-mono space-y-2">
            <MetaRow label="URL" value={artifact.url} />
            <MetaRow label="DOMAIN" value={artifact.source_domain} />
            <MetaRow label="STATUS" value={String(artifact.status_code || '—')} />
            <MetaRow label="CONTENT HASH" value={artifact.content_hash || '—'} />
            <MetaRow label="SCRAPED AT" value={new Date(artifact.scraped_at).toLocaleString()} />
            <MetaRow
              label="MARKDOWN SIZE"
              value={`${(artifact.markdown?.length || 0).toLocaleString()} chars${
                artifact.markdown_truncated ? ' (truncated)' : ''
              }`}
            />
            <MetaRow
              label="CLEAN TEXT SIZE"
              value={`${(artifact.clean_text?.length || 0).toLocaleString()} chars${
                artifact.clean_text_truncated ? ' (truncated)' : ''
              }`}
            />
            {artifact.gcs_html_path && <MetaRow label="ARCHIVE" value={artifact.gcs_html_path} />}
          </dl>
        )}
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="opacity-50 tracking-wider w-28 shrink-0">{label}</dt>
      <dd className="text-white break-all">{value}</dd>
    </div>
  );
}

function countForTab(
  tab: TabId,
  artifact: ArtifactData,
  links: Array<{ href: string }>,
  images: Array<{ src: string }>,
): number | null {
  switch (tab) {
    case 'markdown':
      return null;
    case 'links':
      return links.length;
    case 'images':
      return images.length;
    case 'structured':
      return Object.keys(artifact.structured_data || {}).length;
    case 'meta':
      return null;
  }
}

function contentForTab(
  tab: TabId,
  artifact: ArtifactData,
  links: Array<{ href: string; text: string }>,
  images: Array<{ src: string }>,
  structuredJson: string,
): string {
  switch (tab) {
    case 'markdown':
      return artifact.markdown || artifact.clean_text || '';
    case 'links':
      return links.map((l) => `${l.text}\t${l.href}`).join('\n');
    case 'images':
      return images.map((i) => i.src).join('\n');
    case 'structured':
      return structuredJson;
    case 'meta':
      return JSON.stringify(
        {
          url: artifact.url,
          source_domain: artifact.source_domain,
          status_code: artifact.status_code,
          content_hash: artifact.content_hash,
          scraped_at: artifact.scraped_at,
        },
        null,
        2,
      );
  }
}
