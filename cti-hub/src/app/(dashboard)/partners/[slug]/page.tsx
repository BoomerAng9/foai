'use client';

/**
 * /partners/[slug] — Partner workspace detail
 * ================================================
 * Owner-only partner detail view. Shows the partner header + pages
 * list + documents list with upload form + real download/delete.
 * GUI sub-page creator still ships in H3; webhooks in H4.
 */

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  ExternalLink,
  FileText,
  FolderOpen,
  Globe,
  Plus,
  Trash2,
  Webhook,
} from 'lucide-react';
import type {
  PartnerDetailResponse,
  PartnerDocumentRow,
  PartnerPageRow,
  PartnerRow,
} from '@/lib/partners/types';
import PartnerUploadForm from '@/components/partners/PartnerUploadForm';

function formatBytes(n: number): string {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function PartnerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [partner, setPartner] = useState<PartnerRow | null>(null);
  const [pages, setPages] = useState<PartnerPageRow[]>([]);
  const [documents, setDocuments] = useState<PartnerDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/partners/${slug}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as PartnerDetailResponse;
      setPartner(data.partner);
      setPages(data.pages || []);
      setDocuments(data.documents || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load partner');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    setDeletingId(docId);
    try {
      const res = await fetch(`/api/partners/${slug}/documents/${docId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="inline-block w-6 h-6 rounded-full border-2 animate-spin border-border border-t-accent" />
        <div className="text-xs font-mono text-fg-tertiary mt-3">
          Loading partner…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl">
        <div className="p-4 border border-signal-error/40 bg-signal-error/10 rounded">
          <div className="text-xs font-mono font-bold tracking-wider uppercase text-signal-error mb-1">
            Error
          </div>
          <div className="text-sm text-fg">{error}</div>
        </div>
        <Link
          href="/partners"
          className="inline-block mt-4 text-xs font-mono text-fg-secondary hover:text-accent"
        >
          ← All Partners
        </Link>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="py-16 text-center">
        <Building2 className="w-10 h-10 text-fg-tertiary mx-auto mb-3" />
        <div className="text-sm text-fg-secondary">Partner not found.</div>
        <Link
          href="/partners"
          className="inline-block mt-4 text-xs font-mono text-accent hover:text-accent-hover"
        >
          ← All Partners
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      {/* Breadcrumb */}
      <div className="text-[10px] font-mono text-fg-tertiary mb-4 uppercase tracking-wider">
        <Link href="/partners" className="hover:text-accent transition-colors">
          Partners
        </Link>
        <span className="mx-1.5 text-border-strong">/</span>
        <span className="text-fg-secondary">{partner.slug}</span>
      </div>

      {/* Partner header */}
      <header className="flex items-start gap-5 mb-8 pb-6 border-b border-border">
        <div className="w-16 h-16 bg-bg-elevated border border-border rounded-lg flex items-center justify-center shrink-0">
          {partner.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={partner.logo_url}
              alt={`${partner.name} logo`}
              className="w-full h-full object-contain rounded-lg"
            />
          ) : (
            <Building2 className="w-8 h-8 text-fg-tertiary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-fg truncate">
              {partner.name}
            </h1>
            <span
              className={`text-[9px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded ${
                partner.status === 'active'
                  ? 'bg-signal-live/15 text-signal-live'
                  : 'bg-bg-elevated text-fg-tertiary'
              }`}
            >
              {partner.status}
            </span>
          </div>
          {partner.tagline && (
            <p className="text-sm text-fg-secondary mb-2">{partner.tagline}</p>
          )}
          {partner.website_url && (
            <a
              href={partner.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-fg-tertiary hover:text-accent transition-colors"
            >
              <Globe className="w-3 h-3" />
              {partner.website_url.replace(/^https?:\/\//, '')}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {partner.tags && partner.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {partner.tags.map(tag => (
                <span
                  key={tag}
                  className="text-[10px] font-mono px-2 py-0.5 bg-bg-elevated text-fg-secondary rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Description */}
      {partner.description && (
        <section className="mb-10">
          <h2 className="text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-fg-tertiary mb-2">
            About
          </h2>
          <p className="text-sm text-fg-secondary leading-relaxed whitespace-pre-wrap">
            {partner.description}
          </p>
        </section>
      )}

      {/* Two-column: Pages + Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Sub-pages ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-fg-tertiary">
              Sub-pages
            </h2>
            <button
              type="button"
              disabled
              title="Sub-page creator ships in H3"
              className="inline-flex items-center gap-1 text-[10px] font-mono text-fg-tertiary opacity-50 cursor-not-allowed"
            >
              <Plus className="w-3 h-3" /> New Page
            </button>
          </div>
          {pages.length === 0 ? (
            <div className="p-6 border border-border border-dashed rounded text-center">
              <FolderOpen className="w-6 h-6 text-fg-tertiary mx-auto mb-2" />
              <div className="text-xs text-fg-tertiary">
                No sub-pages yet. GUI page creator ships in H3.
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {pages.map(page => (
                <div
                  key={page.id}
                  className="p-3 border border-border bg-bg-surface rounded hover:border-accent transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-fg">
                      {page.title}
                    </span>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-fg-tertiary">
                      {page.visibility}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-fg-tertiary">
                    /{page.slug} · updated {formatDate(page.updated_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Documents ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-fg-tertiary">
              Documents
            </h2>
            <span className="text-[9px] font-mono text-fg-tertiary">
              {documents.length} file{documents.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Upload form */}
          <div className="mb-3">
            <PartnerUploadForm partnerSlug={slug} onUploaded={fetchDetail} />
          </div>

          {documents.length === 0 ? (
            <div className="p-6 border border-border border-dashed rounded text-center">
              <FileText className="w-6 h-6 text-fg-tertiary mx-auto mb-2" />
              <div className="text-xs text-fg-tertiary">
                No documents yet. Upload the first one above.
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {documents.map(doc => (
                <div
                  key={doc.id}
                  className="p-3 border border-border bg-bg-surface rounded hover:border-accent transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <a
                      href={doc.storage_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-fg hover:text-accent transition-colors truncate flex-1"
                    >
                      {doc.name}
                    </a>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-fg-tertiary shrink-0">
                      {doc.kind}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc.id)}
                      disabled={deletingId === doc.id}
                      className="opacity-0 group-hover:opacity-100 p-1 text-fg-tertiary hover:text-signal-error transition-all disabled:opacity-30"
                      title="Delete document"
                      aria-label={`Delete ${doc.name}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-[10px] font-mono text-fg-tertiary flex items-center gap-2 flex-wrap">
                    <span>{formatBytes(doc.size_bytes)}</span>
                    <span className="opacity-40">·</span>
                    <span>{formatDate(doc.uploaded_at)}</span>
                    {doc.description && (
                      <>
                        <span className="opacity-40">·</span>
                        <span className="truncate">{doc.description}</span>
                      </>
                    )}
                  </div>
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {doc.tags.map(t => (
                        <span
                          key={t}
                          className="text-[9px] font-mono px-1.5 py-0.5 bg-bg-elevated text-fg-tertiary rounded"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Webhooks placeholder */}
      <section className="mt-10 pt-8 border-t border-border">
        <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-fg-tertiary mb-3">
          <Webhook className="w-3 h-3" />
          Webhooks
        </div>
        <div className="p-6 border border-border border-dashed rounded text-center">
          <div className="text-xs text-fg-tertiary">
            Webhook management ships in H4.
          </div>
        </div>
      </section>
    </div>
  );
}
