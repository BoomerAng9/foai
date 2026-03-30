'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Building2, BookOpen, Users, Clock } from 'lucide-react';

interface SeatRecord {
  id?: string;
  institution: string;
  course_name?: string;
  course_title?: string;
  title?: string;
  seats_remaining?: number;
  seats_available?: number;
  seats?: number;
  price?: number | string;
  cost?: number | string;
  start_date?: string;
  term?: string;
  contact?: string;
  contact_email?: string;
  phone?: string;
  url?: string;
  link?: string;
  scraped_at?: string;
  created_at?: string;
  updated_at?: string;
}

const INSTITUTIONS = [
  'All Institutions',
  'Savannah State',
  'SCAD',
  'Armstrong State',
  'Georgia Southern',
  'Savannah Tech',
];

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '--';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function getCourseName(r: SeatRecord): string {
  return r.course_name || r.course_title || r.title || 'Untitled Course';
}

function getSeats(r: SeatRecord): number | null {
  const val = r.seats_remaining ?? r.seats_available ?? r.seats;
  return typeof val === 'number' ? val : null;
}

function getPrice(r: SeatRecord): string {
  const val = r.price ?? r.cost;
  if (val === undefined || val === null) return '--';
  if (typeof val === 'number') return `$${val.toLocaleString()}`;
  return String(val);
}

function getContact(r: SeatRecord): string {
  return r.contact || r.contact_email || r.phone || '--';
}

function getStartDate(r: SeatRecord): string {
  return formatDate(r.start_date || r.term);
}

function getScrapedAt(records: SeatRecord[]): string | null {
  for (const r of records) {
    const t = r.scraped_at || r.updated_at || r.created_at;
    if (t) return t;
  }
  return null;
}

export default function MarketplacePage() {
  const [records, setRecords] = useState<SeatRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState('All Institutions');
  const [error, setError] = useState<string | null>(null);

  const fetchSeats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/seats?limit=200');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      // Support both array response and { seats: [...] } / { records: [...] } / { data: [...] }
      const list: SeatRecord[] = Array.isArray(data)
        ? data
        : data.seats || data.records || data.data || [];
      setRecords(list);
    } catch (err) {
      setError(String((err as Error).message || err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  async function triggerScan() {
    setScanning(true);
    setScanMsg(null);
    try {
      const res = await fetch('/api/seats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setScanMsg(`Scan failed: ${data.error || res.status}`);
      } else {
        setScanMsg('Scan triggered. New data will appear shortly.');
        // Refresh after a delay to pick up new data
        setTimeout(() => fetchSeats(), 5000);
      }
    } catch (err) {
      setScanMsg(`Scan error: ${(err as Error).message}`);
    } finally {
      setScanning(false);
    }
  }

  const filtered =
    filter === 'All Institutions'
      ? records
      : records.filter(
          (r) => r.institution?.toLowerCase().includes(filter.toLowerCase())
        );

  const totalSeats = filtered.reduce((sum, r) => sum + (getSeats(r) ?? 0), 0);
  const uniqueInstitutions = new Set(records.map((r) => r.institution).filter(Boolean));
  const lastScan = getScrapedAt(records);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Search className="w-5 h-5 text-fg-tertiary" />
            <h1 className="text-xl sm:text-2xl font-light tracking-tight">
              <span className="font-bold">Marketplace</span>
            </h1>
          </div>
          <p className="label-mono">Open seats across Savannah-area institutions</p>
        </div>
        <div className="flex items-center gap-3">
          {lastScan && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-fg-tertiary" />
              <span className="font-mono text-[10px] text-fg-tertiary">
                LAST SCAN: {formatTime(lastScan).toUpperCase()}
              </span>
            </div>
          )}
          <button
            onClick={triggerScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-bg text-[11px] font-mono font-bold tracking-wide hover:opacity-90 transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'SCANNING...' : 'SCAN NOW'}
          </button>
        </div>
      </div>

      {/* Scan message */}
      {scanMsg && (
        <div className="border border-border bg-bg-surface px-4 py-2.5">
          <p className="font-mono text-[11px] text-fg-secondary">{scanMsg}</p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-border bg-bg-surface px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-3.5 h-3.5 text-fg-tertiary" />
            <span className="label-mono">Courses Found</span>
          </div>
          <p className="text-2xl font-mono font-bold">{filtered.length}</p>
        </div>
        <div className="border border-border bg-bg-surface px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-3.5 h-3.5 text-fg-tertiary" />
            <span className="label-mono">Total Open Seats</span>
          </div>
          <p className="text-2xl font-mono font-bold">{totalSeats.toLocaleString()}</p>
        </div>
        <div className="border border-border bg-bg-surface px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-3.5 h-3.5 text-fg-tertiary" />
            <span className="label-mono">Institutions Scanned</span>
          </div>
          <p className="text-2xl font-mono font-bold">{uniqueInstitutions.size}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="label-mono">Filter:</span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-8 px-3 bg-bg-surface border border-border text-[11px] font-mono text-fg-secondary focus:outline-none focus:border-fg-tertiary"
        >
          {INSTITUTIONS.map((inst) => (
            <option key={inst} value={inst}>
              {inst}
            </option>
          ))}
        </select>
        <span className="font-mono text-[10px] text-fg-ghost">
          {filtered.length} {filtered.length === 1 ? 'RESULT' : 'RESULTS'}
        </span>
      </div>

      {/* Error state */}
      {error && (
        <div className="border border-border bg-bg-surface px-5 py-4">
          <p className="font-mono text-xs text-signal-error">{error}</p>
          <button
            onClick={fetchSeats}
            className="mt-2 font-mono text-[10px] text-fg-secondary hover:text-fg underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="font-mono text-xs text-fg-tertiary animate-pulse-dot">
            Loading...
          </span>
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state */
        <div className="border border-border bg-bg-surface text-center py-16">
          <Search className="w-10 h-10 text-fg-ghost mx-auto mb-4" />
          <p className="font-mono text-xs text-fg-tertiary">
            {records.length === 0
              ? 'No seats data yet. Run a scan to get started.'
              : 'No results matching this filter.'}
          </p>
        </div>
      ) : (
        /* Data table */
        <div className="border border-border bg-bg-surface overflow-x-auto">
          {/* Header row */}
          <div className="grid grid-cols-[1.2fr_2fr_80px_90px_100px_1fr] gap-4 px-5 py-3 border-b border-border min-w-[700px]">
            {['Institution', 'Course', 'Seats', 'Price', 'Start', 'Contact'].map(
              (h) => (
                <span key={h} className="label-mono">
                  {h}
                </span>
              )
            )}
          </div>

          {/* Rows */}
          {filtered.map((record, idx) => {
            const seats = getSeats(record);
            const linkUrl = record.url || record.link;
            return (
              <div
                key={record.id || idx}
                className="grid grid-cols-[1.2fr_2fr_80px_90px_100px_1fr] gap-4 px-5 py-3.5 border-b border-border last:border-0 hover:bg-bg-elevated transition-colors items-center min-w-[700px]"
              >
                <span className="font-mono text-[11px] text-fg-secondary truncate">
                  {record.institution || '--'}
                </span>
                <div className="min-w-0">
                  {linkUrl ? (
                    <a
                      href={linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium truncate block hover:underline"
                    >
                      {getCourseName(record)}
                    </a>
                  ) : (
                    <p className="text-sm font-medium truncate">
                      {getCourseName(record)}
                    </p>
                  )}
                </div>
                <span
                  className={`font-mono text-xs font-bold ${
                    seats !== null && seats <= 3
                      ? 'text-signal-error'
                      : seats !== null && seats <= 10
                      ? 'text-signal-warn'
                      : 'text-fg'
                  }`}
                >
                  {seats !== null ? seats : '--'}
                </span>
                <span className="font-mono text-xs">{getPrice(record)}</span>
                <span className="font-mono text-[10px] text-fg-secondary">
                  {getStartDate(record)}
                </span>
                <span className="font-mono text-[10px] text-fg-ghost truncate">
                  {getContact(record)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
