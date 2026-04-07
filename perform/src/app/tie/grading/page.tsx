'use client';

/**
 * TIE Grading Workbench
 * ========================
 * Upload a roster → TIE runs the canonical 40·30·30 engine → full report.
 *
 * This is the dedicated simulation surface. Files upload to Smelter OS
 * storage (routed through Puter in the background), and the user can see
 * past runs, re-grade, and export reports.
 *
 * Phase 1 (this commit): UI shell + upload + parse + call grading endpoint
 * Phase 2 (next): Puter file system integration, account creation, saved runs
 */

import { useState, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TIELoader } from '@/components/tie/TIELoader';

const T = {
  bg:        '#060A14',
  bgAlt:     '#0D1424',
  surface:   '#111A2F',
  surfaceAlt:'#0A1020',
  border:    '#1F2A45',
  borderHot: '#D4A853',
  text:      '#FFFFFF',
  textMuted: '#9DA7BD',
  textSubtle:'#6B7589',
  gold:      '#D4A853',
  goldBright:'#FFD700',
  orange:    '#F97316',
  red:       '#D40028',
  green:     '#34D399',
};

interface GradedRow {
  name: string;
  position: string;
  school?: string;
  grade: number;
  gradeClean?: number;
  gradeLetter: string;
  gradeLabel?: string;
  projectedRound?: number;
  medicalDelta?: number;
  trend?: string;
}

export default function TIEGradingPage() {
  const [file, setFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<GradedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function handleFile(f: File | null) {
    if (!f) return;
    setFile(f);
    setError(null);
    setRows([]);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files?.[0] || null);
  }

  async function runGrading() {
    if (!file) return;
    setRunning(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/tie/grade', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Grading failed (${res.status})`);
      }

      const data = await res.json();
      setRows(data.players || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Grading failed');
    } finally {
      setRunning(false);
    }
  }

  if (running) {
    return <TIELoader message="TIE IS GRADING" subtitle={`Running canonical 40·30·30 on ${file?.name}`} />;
  }

  return (
    <div className="min-h-screen" style={{ background: T.bg, color: T.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Ribbon */}
      <div style={{ background: '#000000', borderBottom: `1px solid ${T.border}` }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between text-[11px] font-bold tracking-[0.18em] uppercase">
          <div className="flex items-center gap-3">
            <Link href="/tie" className="opacity-60 hover:opacity-100 transition">← TIE</Link>
            <span className="opacity-50">|</span>
            <span style={{ color: T.gold }}>Grading Workbench</span>
          </div>
          <Link href="/tie/rankings" className="text-[10px] opacity-80 hover:opacity-100 transition">
            Our Rankings →
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden py-16 border-b" style={{ borderColor: T.border }}>
        {/* Grading workstation scene */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/brand/scenes/tie-grading-workstation.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {/* Dark overlay so text stays readable */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(6,10,20,0.88) 0%, rgba(6,10,20,0.72) 50%, rgba(6,10,20,0.88) 100%)',
          }}
        />
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5" style={{ background: `${T.gold}15`, border: `1px solid ${T.gold}40` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: T.gold }} />
            <span className="text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: T.gold }}>
              Upload &rarr; Grade &rarr; Report
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black leading-[0.9] tracking-tight mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Grade Your Roster
          </h1>
          <p className="text-base md:text-lg max-w-2xl mx-auto" style={{ color: T.textMuted }}>
            Drop a CSV, spreadsheet, or scouting sheet. TIE parses it, runs the canonical 40·30·30 formula, and returns a full tier-ranked report with dual grades.
          </p>
        </div>
      </section>

      {/* Upload dropzone */}
      <section className="py-12 border-b" style={{ borderColor: T.border }}>
        <div className="max-w-3xl mx-auto px-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            onClick={() => fileInput.current?.click()}
            className="relative rounded-2xl p-12 text-center cursor-pointer transition-all"
            style={{
              background: dragActive ? `${T.gold}10` : T.surface,
              border: `2px dashed ${dragActive ? T.gold : `${T.gold}40`}`,
              boxShadow: dragActive ? `0 0 40px ${T.gold}30` : 'none',
            }}
          >
            <input
              ref={fileInput}
              type="file"
              accept=".csv,.xlsx,.xls,.json,.tsv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
            <div className="text-5xl mb-4">📥</div>
            {file ? (
              <>
                <div className="text-lg font-bold mb-1">{file.name}</div>
                <div className="text-xs" style={{ color: T.textSubtle }}>
                  {(file.size / 1024).toFixed(1)} KB · ready to grade
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-bold mb-2">Drop your roster here</div>
                <div className="text-xs" style={{ color: T.textSubtle }}>
                  CSV · XLSX · JSON · TSV — up to 500 athletes per file on free tier
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between mt-6">
            <div className="text-[10px] font-mono tracking-[0.15em] uppercase" style={{ color: T.textSubtle }}>
              {rows.length > 0 ? `${rows.length} graded` : 'awaiting upload'}
            </div>
            <button
              onClick={runGrading}
              disabled={!file || running}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-lg font-bold text-sm tracking-[0.15em] uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: file ? `linear-gradient(135deg, ${T.goldBright}, ${T.gold})` : T.surface,
                color: file ? '#0A0E1A' : T.textSubtle,
                boxShadow: file ? `0 8px 24px ${T.gold}35` : 'none',
                border: file ? 'none' : `1px solid ${T.border}`,
              }}
            >
              ▸ Run TIE
            </button>
          </div>

          {error && (
            <div className="mt-5 p-4 rounded-lg text-sm" style={{ background: `${T.red}15`, color: T.red, border: `1px solid ${T.red}40` }}>
              {error}
            </div>
          )}
        </div>
      </section>

      {/* Results */}
      {rows.length > 0 && (
        <section className="py-12">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-baseline justify-between mb-6">
              <div>
                <div className="text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: T.gold }}>◢ Report</div>
                <h2 className="text-3xl font-black tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {rows.length} Athletes Graded
                </h2>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              {rows.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.01, 0.3) }}
                  className="grid grid-cols-[3rem_2.5rem_1fr_5rem_4rem_4rem] items-center gap-3 px-5 py-3 border-t"
                  style={{ borderColor: T.border }}
                >
                  <div className="text-xl font-black tabular-nums" style={{ color: T.gold, fontFamily: "'Outfit', sans-serif" }}>
                    {i + 1}
                  </div>
                  <span
                    className="px-1.5 py-0.5 text-[9px] font-black rounded text-center"
                    style={{ background: `${T.orange}20`, color: T.orange }}
                  >
                    {r.position}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold truncate">{r.name}</div>
                    {r.school && <div className="text-[11px]" style={{ color: T.textMuted }}>{r.school}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black tabular-nums" style={{ color: T.goldBright, fontFamily: "'Outfit', sans-serif" }}>
                      {r.grade.toFixed(1)}
                    </div>
                    <div className="text-[9px] font-bold" style={{ color: T.textMuted }}>{r.gradeLetter}</div>
                  </div>
                  <div className="text-center text-xs font-mono" style={{ color: T.textMuted }}>
                    R{r.projectedRound ?? '—'}
                  </div>
                  <div className="text-center text-[10px] font-bold" style={{ color: r.medicalDelta && r.medicalDelta > 0 ? T.red : T.textSubtle }}>
                    {r.medicalDelta && r.medicalDelta > 0 ? `−${r.medicalDelta.toFixed(1)}` : '—'}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="py-8 text-center text-[10px] font-mono tracking-[0.25em]" style={{ background: '#000000', color: 'rgba(255,255,255,0.4)', borderTop: `1px solid ${T.border}` }}>
        TIE GRADING WORKBENCH · CANONICAL 40·30·30 · PUBLISHED BY ACHIEVEMOR
      </footer>
    </div>
  );
}
