'use client';

/**
 * /sqwaadrun/missions/[id] — Mission detail page
 * =================================================
 * Shows the full mission payload and every scrape artifact,
 * tabbed via ArtifactViewer. This is the value-delivery page —
 * where a paying customer sees what their mission actually
 * produced.
 */

import { useEffect, useState, use, useRef } from 'react';
import Link from 'next/link';
import { ArtifactViewer, type ArtifactData } from '@/components/sqwaadrun/ArtifactViewer';

interface MissionData {
  mission_id: string;
  mission_type: string;
  intent: string | null;
  target_count: number;
  status: string;
  primary_domain: string | null;
  results_count: number;
  elapsed_seconds: number;
  throughput_pps: number;
  error: string | null;
  created_at: string;
}

interface PaginationInfo {
  total_artifacts: number;
  returned: number;
  capped_at: number;
  more_available: boolean;
}

interface ApiSuccess {
  mission: MissionData;
  artifacts: ArtifactData[];
  pagination: PaginationInfo;
}

interface ApiError {
  error: string;
}

function safeDecode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default function MissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolved = use(params);
  const missionId = safeDecode(resolved.id);

  const [data, setData] = useState<ApiSuccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setErrorStatus(null);

    fetch(`/api/sqwaadrun/mission/${encodeURIComponent(missionId)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as ApiError | null;
          setError(body?.error || `Mission fetch failed (${res.status})`);
          setErrorStatus(res.status);
          setData(null);
        } else {
          const body = (await res.json()) as ApiSuccess;
          setData(body);
        }
        setLoading(false);
      })
      .catch((e) => {
        // Ignore cancellations — they fire when the user navigates away.
        if ((e as Error)?.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Network error');
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [missionId]);

  const forbidden = errorStatus === 403;
  const notFound = errorStatus === 404;

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: 'radial-gradient(ellipse at top, #0B1220 0%, #050810 60%)',
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Back link */}
        <Link
          href="/sqwaadrun"
          className="text-[10px] font-mono tracking-[0.25em] opacity-60 hover:opacity-100 inline-block mb-6"
          style={{ color: '#F5A623' }}
        >
          ← HAWK BAY
        </Link>

        {/* Loading */}
        {loading && (
          <div className="py-20 text-center">
            <div
              className="text-[10px] font-mono tracking-[0.3em] mb-3"
              style={{ color: '#F5A623' }}
            >
              LOADING MISSION
            </div>
            <div className="text-4xl font-black opacity-40">{missionId}</div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div
            className="p-8 border-2 max-w-xl"
            style={{
              borderColor: 'rgba(239,68,68,0.4)',
              background: 'rgba(239,68,68,0.05)',
              borderRadius: '3px',
            }}
          >
            <div
              className="text-[9px] font-mono tracking-[0.25em] mb-2"
              style={{ color: '#EF4444' }}
            >
              {forbidden
                ? 'ACCESS DENIED'
                : notFound
                ? 'MISSION NOT FOUND'
                : 'MISSION UNAVAILABLE'}
            </div>
            <div className="text-xl font-bold mb-2">
              {forbidden
                ? 'This mission belongs to another operator.'
                : notFound
                ? 'No mission with this ID.'
                : error}
            </div>
            <div className="text-[11px] opacity-60 font-mono mb-5">
              {forbidden
                ? 'You can only view missions dispatched from your own Sqwaadrun account.'
                : notFound
                ? 'Check the mission ID and try again.'
                : 'Please try again in a moment.'}
            </div>
            <Link
              href="/sqwaadrun"
              className="inline-block px-5 py-2 text-[10px] font-mono tracking-wider font-bold"
              style={{ background: '#F5A623', color: '#050810', borderRadius: '2px' }}
            >
              BACK TO HAWK BAY →
            </Link>
          </div>
        )}

        {/* Success */}
        {!loading && !error && data && (
          <>
            {/* Mission hero */}
            <div
              className="border-2 p-6 mb-8"
              style={{
                borderColor:
                  data.mission.status === 'completed'
                    ? 'rgba(34,211,238,0.5)'
                    : data.mission.status === 'failed'
                    ? 'rgba(239,68,68,0.4)'
                    : 'rgba(245,166,35,0.4)',
                background: 'linear-gradient(165deg, rgba(245,166,35,0.04), transparent)',
                borderRadius: '3px',
              }}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
                <div>
                  <div className="text-[9px] font-mono tracking-[0.3em] opacity-60 mb-1">
                    MISSION
                  </div>
                  <div className="text-3xl font-black tracking-tight">{data.mission.mission_id}</div>
                  <div
                    className="text-[11px] font-mono uppercase mt-2 tracking-wider"
                    style={{ color: '#F5A623' }}
                  >
                    {data.mission.mission_type}
                  </div>
                </div>

                <div
                  className="px-4 py-2 text-[10px] font-mono tracking-[0.25em] font-bold shrink-0"
                  style={{
                    border: `1px solid ${
                      data.mission.status === 'completed'
                        ? '#22D3EE'
                        : data.mission.status === 'failed'
                        ? '#EF4444'
                        : '#F5A623'
                    }`,
                    color:
                      data.mission.status === 'completed'
                        ? '#22D3EE'
                        : data.mission.status === 'failed'
                        ? '#EF4444'
                        : '#F5A623',
                    background:
                      data.mission.status === 'completed'
                        ? 'rgba(34,211,238,0.08)'
                        : data.mission.status === 'failed'
                        ? 'rgba(239,68,68,0.08)'
                        : 'rgba(245,166,35,0.08)',
                    borderRadius: '2px',
                  }}
                >
                  {data.mission.status.toUpperCase()}
                </div>
              </div>

              {data.mission.intent && (
                <div className="mb-5 pb-5 border-b" style={{ borderColor: 'rgba(245,166,35,0.15)' }}>
                  <div className="text-[9px] font-mono tracking-[0.25em] opacity-60 mb-1">INTENT</div>
                  <div className="text-sm italic" style={{ color: '#CBD5E1' }}>
                    &ldquo;{data.mission.intent}&rdquo;
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-[11px]">
                <Stat label="TARGETS" value={String(data.mission.target_count)} />
                <Stat label="RESULTS" value={String(data.mission.results_count)} />
                <Stat
                  label="ELAPSED"
                  value={`${data.mission.elapsed_seconds.toFixed(1)}s`}
                />
                <Stat
                  label="THROUGHPUT"
                  value={`${data.mission.throughput_pps.toFixed(1)} pps`}
                />
                <Stat
                  label="DOMAIN"
                  value={data.mission.primary_domain || '—'}
                />
              </div>

              {data.mission.error && (
                <div
                  className="mt-5 p-3 border text-[11px] font-mono"
                  style={{
                    borderColor: 'rgba(239,68,68,0.4)',
                    background: 'rgba(239,68,68,0.08)',
                    color: '#FCA5A5',
                    borderRadius: '2px',
                  }}
                >
                  <span className="opacity-60">ERROR: </span>
                  {data.mission.error}
                </div>
              )}
            </div>

            {/* Artifacts */}
            <div>
              <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-xl font-black tracking-tight">
                  Artifacts
                  <span className="text-sm font-mono opacity-50 ml-3">
                    {data.pagination.returned} of {data.pagination.total_artifacts} result
                    {data.pagination.total_artifacts === 1 ? '' : 's'}
                  </span>
                </h2>
                {data.pagination.more_available && (
                  <div
                    className="text-[10px] font-mono"
                    style={{ color: '#F5A623' }}
                  >
                    Showing first {data.pagination.capped_at} · download JSON for full set
                  </div>
                )}
              </div>

              {data.artifacts.length === 0 && (
                <div
                  className="p-8 text-center border"
                  style={{
                    borderColor: 'rgba(245,166,35,0.2)',
                    background: 'rgba(245,166,35,0.03)',
                    borderRadius: '3px',
                  }}
                >
                  <div
                    className="text-[10px] font-mono tracking-[0.25em] mb-2 opacity-60"
                    style={{ color: '#F5A623' }}
                  >
                    NO ARTIFACTS
                  </div>
                  <div className="text-sm opacity-80">
                    This mission did not return any artifacts. Contact support if you expected
                    results.
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {data.artifacts.map((artifact) => (
                  <ArtifactViewer key={artifact.id} artifact={artifact} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[8px] font-mono tracking-[0.2em] opacity-60 mb-0.5">{label}</div>
      <div className="text-base font-bold">{value}</div>
    </div>
  );
}
