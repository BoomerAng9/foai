'use client';

/**
 * /partners — Partners index (owner-only, cti-only)
 * ====================================================
 * Lists every onboarded partner as a card. Click any card to open
 * the partner's workspace. First partner = MindEdge (seeded in
 * `ensurePartnersTables()`).
 *
 * Upload flow + GUI sub-page creator ship in Task H2/H3.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plus, ExternalLink, Handshake, Building2 } from 'lucide-react';
import type { PartnerRow } from '@/lib/partners/types';

export default function PartnersIndexPage() {
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/partners')
      .then(async r => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((d: { partners: PartnerRow[] }) => {
        setPartners(d.partners || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to load partners');
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-fg-tertiary mb-2">
            <Handshake className="w-3 h-3" />
            <span>Owner · Partner Workspaces</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-fg">Partners</h1>
          <p className="text-sm text-fg-secondary mt-2 max-w-xl">
            On-prem workspaces for every partner on the platform. Upload marketing
            materials, webhooks, and partner package documents here. Each partner
            gets its own sub-page tree and file library.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-bg text-xs font-mono font-bold tracking-wider uppercase rounded hover:bg-accent-hover transition-colors"
          disabled
          title="Partner creation GUI ships in H2"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Partner
        </button>
      </div>

      {/* State */}
      {loading && (
        <div className="py-16 text-center">
          <div className="inline-block w-6 h-6 rounded-full border-2 animate-spin border-border border-t-accent" />
          <div className="text-xs font-mono text-fg-tertiary mt-3">
            Loading partners…
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 border border-signal-error/40 bg-signal-error/10 rounded">
          <div className="text-xs font-mono font-bold tracking-wider uppercase text-signal-error mb-1">
            Error
          </div>
          <div className="text-sm text-fg">{error}</div>
        </div>
      )}

      {!loading && !error && partners.length === 0 && (
        <div className="py-16 text-center">
          <Building2 className="w-10 h-10 text-fg-tertiary mx-auto mb-3" />
          <div className="text-sm text-fg-secondary">No partners onboarded yet.</div>
        </div>
      )}

      {/* Partner cards */}
      {!loading && !error && partners.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {partners.map(partner => (
            <Link
              key={partner.id}
              href={`/partners/${partner.slug}`}
              className="group block border border-border bg-bg-surface rounded-lg p-5 hover:border-accent hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-bg-elevated border border-border rounded flex items-center justify-center shrink-0">
                  {partner.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={partner.logo_url}
                      alt={`${partner.name} logo`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Building2 className="w-5 h-5 text-fg-tertiary" />
                  )}
                </div>
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
              <div className="font-bold text-base text-fg group-hover:text-accent transition-colors mb-1">
                {partner.name}
              </div>
              <p className="text-xs text-fg-secondary line-clamp-2 mb-3">
                {partner.tagline || partner.description || '—'}
              </p>
              {partner.tags && partner.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {partner.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="text-[9px] font-mono px-1.5 py-0.5 bg-bg-elevated text-fg-tertiary rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between text-[10px] font-mono text-fg-tertiary">
                <span>Open workspace →</span>
                {partner.website_url && (
                  <ExternalLink className="w-3 h-3" />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
