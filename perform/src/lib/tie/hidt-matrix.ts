/**
 * HIDT Training Matrix — Workforce TIE Source of Truth
 * ======================================================
 * Adopted from Rish's original 2022 HIDT (Human Investment Development
 * Training) matrix built for KSA Vision 2030 / Shareek / NTP / HCDP /
 * TVTC initiatives. This is the workforce-vertical equivalent of
 * Per|Form's sports player matrix — it powers TIE scoring across the
 * Talent / Innovation / Execution pillars for non-sports verticals
 * (Workforce, Student, Contractor, Founder).
 *
 * The raw spreadsheet lives at hidt-matrix-raw.json. This module
 * lazy-parses it into typed structures and exposes accessors used by
 *   - workforce-engine.ts  → TIE scoring for learners
 *   - lead-builder.ts      → targeted lead generation per row
 *   - campaign-builder.ts  → course/cert campaigns per role × sector
 *
 * The matrix is EXPANDABLE — new sectors, courses, certs, and skills
 * can be appended to the raw JSON or written to the `hidt_matrix`
 * Smelter OS DB table without changing this module's shape.
 */

import rawMatrix from './hidt-matrix-raw.json';

/* ── Core enums ── */
export type SkillLevel = 'entry' | 'mid' | 'senior' | 'executive';
export type Importance = 'Essential' | 'High' | 'Medium' | 'Low';
export type Demand = 'High' | 'Moderate' | 'Medium' | 'Low';
export type Currency = 'SAR' | 'AED' | 'QAR' | 'OMR' | 'USD' | 'GBP';

/* ── Sectors / Initiatives (Vision 2030 program lines) ── */
export interface HidtSector {
  id: string;
  name: string;
  description?: string;
}

export const HIDT_SECTORS: HidtSector[] = [
  { id: 'shareek',     name: 'Shareek',         description: 'Saudi Vision 2030 private-sector partnership program' },
  { id: 'ntp',         name: 'NTP',             description: 'National Transformation Program' },
  { id: 'vision-2030', name: 'Vision 2030',     description: 'Cross-cutting Vision 2030 initiatives' },
  { id: 'hcdp',        name: 'HCDP',            description: 'Human Capital Development Program' },
  { id: 'tvtc',        name: 'TVTC / MOE / COE',description: 'Technical & Vocational Training Corp + Ministry of Education + Centers of Excellence' },
];

/* ── Course rows (a course offered for one sector × audience) ── */
export interface HidtCourse {
  id: string;
  sectorId: string;
  topic: string;
  targetGroups: string[];
  softSkills: string[];
  levels: Record<SkillLevel, boolean>;
  description: string;
}

/* ── Soft-skill taxonomy with demand + salary signals ── */
export interface HidtSoftSkill {
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
export interface HidtCertification {
  name: string;
  topJobs: string[];
  prerequisites: string;
  salaryByCurrency: Partial<Record<Currency, string>>;
}

/* ── Pricing rows (course list price + discount tiers) ── */
export interface HidtPricingRow {
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
let _courses: HidtCourse[] | null = null;
export function getCourses(): HidtCourse[] {
  if (_courses) return _courses;
  const rows = raw['Course Matrix'] || [];
  const out: HidtCourse[] = [];
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
let _softSkills: HidtSoftSkill[] | null = null;
export function getSoftSkills(): HidtSoftSkill[] {
  if (_softSkills) return _softSkills;
  const rows = raw['Soft Skills'] || [];
  const out: HidtSoftSkill[] = [];
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
let _certifications: HidtCertification[] | null = null;
export function getCertifications(): HidtCertification[] {
  if (_certifications) return _certifications;
  const rows = raw['CYBER'] || [];
  const out: HidtCertification[] = [];
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

/* ── Pricing rows (HIDT Per Class Time + Eng. Adults) ── */
let _pricing: HidtPricingRow[] | null = null;
export function getPricing(): HidtPricingRow[] {
  if (_pricing) return _pricing;
  const out: HidtPricingRow[] = [];
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
export function getCoursesForSector(sectorId: string): HidtCourse[] {
  return getCourses().filter(c => c.sectorId === sectorId);
}

export function getCoursesForLevel(level: SkillLevel): HidtCourse[] {
  return getCourses().filter(c => c.levels[level]);
}

export function getCoursesForRole(roleQuery: string): HidtCourse[] {
  const q = roleQuery.toLowerCase();
  return getCourses().filter(c =>
    c.targetGroups.some(g => g.toLowerCase().includes(q)),
  );
}

export function findSoftSkill(name: string): HidtSoftSkill | undefined {
  const q = name.toLowerCase();
  return getSoftSkills().find(s => s.name.toLowerCase().includes(q));
}

export function getMatrixStats() {
  return {
    sectors: HIDT_SECTORS.length,
    courses: getCourses().length,
    softSkills: getSoftSkills().length,
    certifications: getCertifications().length,
    pricingRows: getPricing().length,
  };
}
