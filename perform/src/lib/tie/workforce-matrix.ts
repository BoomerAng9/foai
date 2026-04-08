/**
 * Workforce Training Matrix — TIE Workforce Seed Data
 * ====================================================
 * Adopted from Rish's original 2022 A.I.M.S. Training Matrix built for
 * KSA Vision 2030 / Shareek / NTP / HCDP / TVTC initiatives. This is
 * the workforce-vertical equivalent of Per|Form's sports player matrix
 * — it powers TIE scoring across the Talent / Innovation / Execution
 * pillars for non-sports verticals (Workforce, Student, Contractor,
 * Founder).
 *
 * NOTE: This file is the workforce SEED DATA only. The canonical
 * platform pricing/catalog lives in a separate canonical package
 * (aims-pricing-matrix). Do not add LLM/model pricing rows here — those
 * belong in the pricing matrix package.
 *
 * The raw spreadsheet lives at workforce-matrix-raw.json. This module
 * lazy-parses it into typed structures and exposes accessors used by
 *   - workforce-engine.ts  → TIE scoring for learners
 *   - lead-builder.ts      → targeted lead generation per row
 *   - campaign-builder.ts  → course/cert campaigns per role × sector
 *
 * The matrix is EXPANDABLE — new sectors, courses, certs, and skills
 * can be appended to the raw JSON or written to the `workforce_matrix`
 * DB table without changing this module's shape.
 */

import rawMatrix from './workforce-matrix-raw.json';

/* ── Core enums ── */
export type SkillLevel = 'entry' | 'mid' | 'senior' | 'executive';
export type Importance = 'Essential' | 'High' | 'Medium' | 'Low';
export type Demand = 'High' | 'Moderate' | 'Medium' | 'Low';
export type Currency = 'SAR' | 'AED' | 'QAR' | 'OMR' | 'USD' | 'GBP';

/* ── Sectors / Initiatives (Vision 2030 program lines) ── */
export interface WorkforceSector {
  id: string;
  name: string;
  description?: string;
}

export const WORKFORCE_SECTORS: WorkforceSector[] = [
  { id: 'shareek',     name: 'Shareek',         description: 'Saudi Vision 2030 private-sector partnership program' },
  { id: 'ntp',         name: 'NTP',             description: 'National Transformation Program' },
  { id: 'vision-2030', name: 'Vision 2030',     description: 'Cross-cutting Vision 2030 initiatives' },
  { id: 'hcdp',        name: 'HCDP',            description: 'Human Capital Development Program' },
  { id: 'tvtc',        name: 'TVTC / MOE / COE',description: 'Technical & Vocational Training Corp + Ministry of Education + Centers of Excellence' },
];

/* ── Course rows (a course offered for one sector × audience) ── */
export interface WorkforceCourse {
  id: string;
  sectorId: string;
  topic: string;
  targetGroups: string[];
  softSkills: string[];
  levels: Record<SkillLevel, boolean>;
  description: string;
}

/* ── Soft-skill taxonomy with demand + salary signals ── */
export interface WorkforceSoftSkill {
  category: string;
  name: string;
  applicableRoles: string[];
  importance: Importance;
  demand: Demand;
  level: string;
  salary: {
    entryMonthlyKsaSar: string;
    managerMonthlyKsaSar: string;
    executiveMonthlyKsaSar: string;
    trainerMarketRate: string;
  };
}

/* ── Certification → role → salary outcome (the workforce
 *    parallel of Per|Form's draft outcome → contract forecast) ── */
export interface WorkforceCertification {
  name: string;
  topJobs: string[];
  prerequisites: string;
  salaryByCurrency: Partial<Record<Currency, string>>;
}

/* ── Pricing rows (course list price + discount tiers) ── */
export interface WorkforcePricingRow {
  institute: string;
  course: string;
  durationHours?: number;
  perSession?: string;
  pricing: {
    originalSar: number;
    corporate25Sar?: number;
    discount40Sar?: number;
    discount15Sar?: number;
  };
  competitor?: { name: string; price: number };
}

/* ── Lazy parser ── */
type RawRow = string[];
type RawSheet = RawRow[];
type RawWorkbook = Record<string, RawSheet>;

const raw: RawWorkbook = rawMatrix as RawWorkbook;

function clean(s: string | undefined | null): string {
  return (s ?? '').toString().trim().replace(/\s+/g, ' ');
}

function bool(cell: string): boolean {
  return /[✓✔xX1]/.test(clean(cell));
}

function slug(s: string): string {
  return clean(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/* ── Course Matrix parser ──
 * The raw sheet has merged cells: a Sector cell on the row that introduces
 * the sector and blanks below it; a Course cell on the row that introduces
 * the course and a continuation row beneath. We carry-forward both.
 */
let _courses: WorkforceCourse[] | null = null;
export function getCourses(): WorkforceCourse[] {
  if (_courses) return _courses;
  const rows = raw['Course Matrix'] || [];
  const out: WorkforceCourse[] = [];
  let currentSector = '';
  let currentTopic = '';
  let currentTargetGroups: string[] = [];
  let currentDescription = '';
  let currentSoftSkills: string[] = [];
  let currentLevels: Record<SkillLevel, boolean> = { entry: false, mid: false, senior: false, executive: false };

  const flush = () => {
    if (currentTopic) {
      out.push({
        id: `${slug(currentSector)}-${slug(currentTopic)}`,
        sectorId: slug(currentSector) || 'unspecified',
        topic: currentTopic,
        targetGroups: currentTargetGroups,
        softSkills: [...currentSoftSkills],
        levels: { ...currentLevels },
        description: currentDescription,
      });
    }
    currentSoftSkills = [];
    currentLevels = { entry: false, mid: false, senior: false, executive: false };
  };

  // Header row is R3: Sector | Topic | Target | Soft | Entry | Mid | Senior | Exec | Description
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i] || [];
    const sector = clean(r[0]);
    const topic = clean(r[1]);
    const target = clean(r[2]);
    const soft = clean(r[3]);
    const entry = bool(r[4]);
    const mid = bool(r[5]);
    const senior = bool(r[6]);
    const exec = bool(r[7]);
    const desc = clean(r[8]);

    if (sector) currentSector = sector;
    if (topic) {
      flush();
      currentTopic = topic;
      currentTargetGroups = target ? target.split(/\s*,\s*/) : [];
      currentDescription = desc;
    }
    if (soft) currentSoftSkills.push(soft);
    if (entry) currentLevels.entry = true;
    if (mid) currentLevels.mid = true;
    if (senior) currentLevels.senior = true;
    if (exec) currentLevels.executive = true;
  }
  flush();

  _courses = out.filter(c => c.topic && !/the matrix legend/i.test(c.topic));
  return _courses;
}

/* ── Soft Skills parser (rows R2-R21 are the structured taxonomy) ── */
let _softSkills: WorkforceSoftSkill[] | null = null;
export function getSoftSkills(): WorkforceSoftSkill[] {
  if (_softSkills) return _softSkills;
  const rows = raw['Soft Skills'] || [];
  const out: WorkforceSoftSkill[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const category = clean(r[0]);
    const name = clean(r[1]);
    if (!category || !name || /applicable roles|soft skill categor|skill importance|demand temperature|skill level|trainer market/i.test(category + name)) continue;
    out.push({
      category,
      name,
      applicableRoles: clean(r[2]).split(/\s*,\s*/).filter(Boolean),
      importance: (clean(r[3]) as Importance) || 'Medium',
      demand: (clean(r[4]) as Demand) || 'Medium',
      level: clean(r[5]),
      salary: {
        entryMonthlyKsaSar: clean(r[6]),
        managerMonthlyKsaSar: clean(r[7]),
        executiveMonthlyKsaSar: clean(r[8]),
        trainerMarketRate: clean(r[9]),
      },
    });
  }
  _softSkills = out;
  return _softSkills;
}

/* ── Certifications parser (CYBER sheet) ── */
let _certifications: WorkforceCertification[] | null = null;
export function getCertifications(): WorkforceCertification[] {
  if (_certifications) return _certifications;
  const rows = raw['CYBER'] || [];
  const out: WorkforceCertification[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const name = clean(r[0]);
    if (!name || /certification/i.test(name)) continue;
    out.push({
      name,
      topJobs: clean(r[1]).split(/\s*,\s*/).filter(Boolean),
      prerequisites: clean(r[2]),
      salaryByCurrency: {
        SAR: clean(r[3]),
        AED: clean(r[4]),
        QAR: clean(r[5]),
        OMR: clean(r[6]),
        USD: clean(r[7]),
        GBP: clean(r[8]),
      },
    });
  }
  _certifications = out;
  return _certifications;
}

/* ── Pricing rows (A.I.M.S. Per Class Time + Eng. Adults) ── */
let _pricing: WorkforcePricingRow[] | null = null;
export function getPricing(): WorkforcePricingRow[] {
  if (_pricing) return _pricing;
  const out: WorkforcePricingRow[] = [];
  const sheet = raw['HIDT Per Class Time'] || [];
  for (let i = 1; i < sheet.length; i++) {
    const r = sheet[i] || [];
    const institute = clean(r[0]);
    const course = clean(r[1]);
    if (!course) continue;
    const num = (s: string) => {
      const v = parseFloat(clean(s).replace(/[^0-9.]/g, ''));
      return Number.isFinite(v) ? v : undefined;
    };
    out.push({
      institute,
      course,
      durationHours: num(r[2]),
      perSession: clean(r[3]),
      pricing: {
        originalSar: num(r[5]) ?? 0,
        corporate25Sar: num(r[6]),
        discount40Sar: num(r[7]),
        discount15Sar: num(r[8]),
      },
    });
  }
  _pricing = out;
  return _pricing;
}

/* ── Lookups for the workforce engine ── */
export function getCoursesForSector(sectorId: string): WorkforceCourse[] {
  return getCourses().filter(c => c.sectorId === sectorId);
}

export function getCoursesForLevel(level: SkillLevel): WorkforceCourse[] {
  return getCourses().filter(c => c.levels[level]);
}

export function getCoursesForRole(roleQuery: string): WorkforceCourse[] {
  const q = roleQuery.toLowerCase();
  return getCourses().filter(c =>
    c.targetGroups.some(g => g.toLowerCase().includes(q)),
  );
}

export function findSoftSkill(name: string): WorkforceSoftSkill | undefined {
  const q = name.toLowerCase();
  return getSoftSkills().find(s => s.name.toLowerCase().includes(q));
}

export function getMatrixStats() {
  return {
    sectors: WORKFORCE_SECTORS.length,
    courses: getCourses().length,
    softSkills: getSoftSkills().length,
    certifications: getCertifications().length,
    pricingRows: getPricing().length,
  };
}
