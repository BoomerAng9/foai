/**
 * Madden + 2K-style expanded attribute catalog for Per|Form TIE
 * ==============================================================
 * Canonical list of individual attribute ratings (0-99). Each attribute
 * rolls up into one of the three TIE pillars:
 *
 *   performance  (40%)  — what the player DOES on the field
 *   attributes   (30%)  — physical/athletic traits
 *   intangibles  (30%)  — mental + character + medical
 *
 * 2K-style badge tiers unlock automatically at rating thresholds
 * (Bronze 80-84, Silver 85-89, Gold 90-94, Hall of Fame 95-99).
 * Badges are derived — never stored as a source of truth.
 */

export type Pillar = 'performance' | 'attributes' | 'intangibles';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'hof';

export interface AttributeDef {
  code: string;           // short canonical code, e.g. 'SPD', 'THP', 'INJ'
  label: string;          // display name
  pillar: Pillar;
  positions: string[];    // position codes this attribute applies to ('*' = all)
  description: string;
}

/* ── Pillar 2: Attributes (physical/athletic) — universal ─────────────── */
export const PHYSICAL_ATTRIBUTES: AttributeDef[] = [
  { code: 'SPD',  label: 'Speed',              pillar: 'attributes',  positions: ['*'], description: 'Top-end sprint speed.' },
  { code: 'ACC',  label: 'Acceleration',       pillar: 'attributes',  positions: ['*'], description: 'Zero-to-top gear.' },
  { code: 'AGI',  label: 'Agility',            pillar: 'attributes',  positions: ['*'], description: 'Lateral quickness and change-of-direction.' },
  { code: 'CHG',  label: 'Change of Direction',pillar: 'attributes',  positions: ['*'], description: 'Three-cone and shuttle-driven cut agility.' },
  { code: 'STR',  label: 'Strength',           pillar: 'attributes',  positions: ['*'], description: 'Raw power through contact.' },
  { code: 'JMP',  label: 'Jumping',            pillar: 'attributes',  positions: ['*'], description: 'Vertical and broad leap.' },
  { code: 'SIZ',  label: 'Size',               pillar: 'attributes',  positions: ['*'], description: 'Height + weight + frame composite.' },
  { code: 'STA',  label: 'Stamina',            pillar: 'attributes',  positions: ['*'], description: 'Endurance across a full game/season.' },
  { code: 'BAL',  label: 'Balance',            pillar: 'attributes',  positions: ['*'], description: 'Body control through contact.' },
  { code: 'EXP',  label: 'Explosiveness',      pillar: 'attributes',  positions: ['*'], description: 'First-step burst + change of pace.' },
];

/* ── Pillar 3: Intangibles (mental/character/medical) — universal ─────── */
export const INTANGIBLE_ATTRIBUTES: AttributeDef[] = [
  { code: 'AWR',  label: 'Awareness',          pillar: 'intangibles', positions: ['*'], description: 'Football IQ — pre-snap read and in-play recognition.' },
  { code: 'PRC',  label: 'Play Recognition',   pillar: 'intangibles', positions: ['*'], description: 'Diagnose and react to formations and tendencies.' },
  { code: 'MTR',  label: 'Motor',              pillar: 'intangibles', positions: ['*'], description: 'Effort snap-to-whistle on every play.' },
  { code: 'LDR',  label: 'Leadership',         pillar: 'intangibles', positions: ['*'], description: 'Captaincy + locker-room presence.' },
  { code: 'CLU',  label: 'Clutch',             pillar: 'intangibles', positions: ['*'], description: 'Performance in high-leverage moments.' },
  { code: 'COMP', label: 'Competitiveness',    pillar: 'intangibles', positions: ['*'], description: 'Will to win, every rep.' },
  { code: 'INJ',  label: 'Medical Durability', pillar: 'intangibles', positions: ['*'], description: 'Availability + return-from-injury + play-through-pain. Jeremiyah Love=99 (played 2025 season post-knee injury, unbraced).' },
  { code: 'TGH',  label: 'Toughness',          pillar: 'intangibles', positions: ['*'], description: 'Plays through pain and contact.' },
  { code: 'DISC', label: 'Discipline',         pillar: 'intangibles', positions: ['*'], description: 'Penalty rate + mental consistency.' },
  { code: 'CHR',  label: 'Character',          pillar: 'intangibles', positions: ['*'], description: 'Off-field stability + coachability.' },
];

/* ── Pillar 1: Performance (position-specific Madden attributes) ───────── */

// Offense
export const QB_ATTRIBUTES: AttributeDef[] = [
  { code: 'THP',  label: 'Throw Power',          pillar: 'performance', positions: ['QB'], description: 'Arm velocity and deep-ball strength.' },
  { code: 'TAS',  label: 'Throw Accuracy Short', pillar: 'performance', positions: ['QB'], description: 'Under-10-yard accuracy.' },
  { code: 'TAM',  label: 'Throw Accuracy Medium',pillar: 'performance', positions: ['QB'], description: '10-20 yard accuracy.' },
  { code: 'TAD',  label: 'Throw Accuracy Deep',  pillar: 'performance', positions: ['QB'], description: '20+ yard accuracy.' },
  { code: 'PAC',  label: 'Play-Action',          pillar: 'performance', positions: ['QB'], description: 'Sell-and-release efficiency.' },
  { code: 'RUN',  label: 'Running (QB)',         pillar: 'performance', positions: ['QB'], description: 'Scramble and designed-run effectiveness.' },
  { code: 'BCV',  label: 'Ball Carrier Vision',  pillar: 'performance', positions: ['QB','RB'], description: 'Reading defensive flow.' },
  { code: 'SAC',  label: 'Short-Area Control',   pillar: 'performance', positions: ['QB'], description: 'Pocket maneuvering and sack avoidance.' },
];

export const RB_ATTRIBUTES: AttributeDef[] = [
  { code: 'TRK',  label: 'Trucking',             pillar: 'performance', positions: ['RB'], description: 'Run-through-contact power.' },
  { code: 'ELU',  label: 'Elusiveness',          pillar: 'performance', positions: ['RB','WR'], description: 'Make defenders miss in space.' },
  { code: 'BTK',  label: 'Break Tackle',         pillar: 'performance', positions: ['RB','WR','TE'], description: 'Shed first contact.' },
  { code: 'CAR',  label: 'Carrying',             pillar: 'performance', positions: ['RB','WR'], description: 'Ball security.' },
  { code: 'JKM',  label: 'Juke Move',            pillar: 'performance', positions: ['RB','WR'], description: 'Side-step cut effectiveness.' },
  { code: 'SPM',  label: 'Spin Move',            pillar: 'performance', positions: ['RB','WR'], description: 'Spin cut effectiveness.' },
  { code: 'SFA',  label: 'Stiff Arm',            pillar: 'performance', positions: ['RB'], description: 'Ward-off power through contact.' },
  { code: 'PBK',  label: 'Pass Block (Back)',    pillar: 'performance', positions: ['RB','TE'], description: 'Blitz pickup.' },
];

export const WR_ATTRIBUTES: AttributeDef[] = [
  { code: 'CTH',  label: 'Catching',             pillar: 'performance', positions: ['WR','TE','RB'], description: 'Secure hands, drop rate.' },
  { code: 'CIT',  label: 'Catch In Traffic',     pillar: 'performance', positions: ['WR','TE'], description: 'Catching through contact.' },
  { code: 'SPC',  label: 'Spectacular Catch',    pillar: 'performance', positions: ['WR','TE'], description: 'Contested / acrobatic catches.' },
  { code: 'RLS',  label: 'Release',              pillar: 'performance', positions: ['WR','TE'], description: 'Separation off the line.' },
  { code: 'SRR',  label: 'Short Route Running',  pillar: 'performance', positions: ['WR','TE'], description: 'Precision on 0-10 yard routes.' },
  { code: 'MRR',  label: 'Medium Route Running', pillar: 'performance', positions: ['WR','TE'], description: 'Precision on 10-20 yard routes.' },
  { code: 'DRR',  label: 'Deep Route Running',   pillar: 'performance', positions: ['WR'], description: 'Precision on 20+ yard routes.' },
  { code: 'RBK',  label: 'Run Block',            pillar: 'performance', positions: ['WR','TE','OT','OG','C'], description: 'Run-blocking effectiveness.' },
];

export const TE_ATTRIBUTES: AttributeDef[] = [
  { code: 'IBL',  label: 'Impact Block',         pillar: 'performance', positions: ['TE','OT','OG','C'], description: 'De-cleating blocks and pancakes.' },
];

export const OL_ATTRIBUTES: AttributeDef[] = [
  { code: 'RBP',  label: 'Run Block Power',      pillar: 'performance', positions: ['OT','OG','C'], description: 'Drive blocking strength.' },
  { code: 'RBF',  label: 'Run Block Footwork',   pillar: 'performance', positions: ['OT','OG','C'], description: 'Angle and leverage in the run game.' },
  { code: 'PBP',  label: 'Pass Block Power',     pillar: 'performance', positions: ['OT','OG','C'], description: 'Anchor vs bull rush.' },
  { code: 'PBF',  label: 'Pass Block Footwork',  pillar: 'performance', positions: ['OT','OG','C'], description: 'Set and mirror in pass protection.' },
  { code: 'LBK',  label: 'Lead Block',           pillar: 'performance', positions: ['OG','C','TE','RB'], description: 'Pulling and lead-blocking agility.' },
];

// Defense
export const DL_ATTRIBUTES: AttributeDef[] = [
  { code: 'BSH',  label: 'Block Shedding',       pillar: 'performance', positions: ['DL','EDGE','LB','S'], description: 'Disengage from blockers.' },
  { code: 'PMV',  label: 'Power Moves',          pillar: 'performance', positions: ['DL','EDGE'], description: 'Bull rush, long-arm, push-pull.' },
  { code: 'FMV',  label: 'Finesse Moves',        pillar: 'performance', positions: ['DL','EDGE'], description: 'Swim, rip, spin, ghost.' },
  { code: 'TAK',  label: 'Tackle',               pillar: 'performance', positions: ['DL','EDGE','LB','CB','S'], description: 'Secure-tackle reliability.' },
  { code: 'PUR',  label: 'Pursuit',              pillar: 'performance', positions: ['DL','EDGE','LB','S','CB'], description: 'Chase angles and closing speed.' },
  { code: 'HPW',  label: 'Hit Power',            pillar: 'performance', positions: ['LB','S','EDGE','DL'], description: 'Impact on contact.' },
];

export const CB_S_ATTRIBUTES: AttributeDef[] = [
  { code: 'MCV',  label: 'Man Coverage',         pillar: 'performance', positions: ['CB','S','LB'], description: 'Sticky press/off-man.' },
  { code: 'ZCV',  label: 'Zone Coverage',        pillar: 'performance', positions: ['CB','S','LB'], description: 'Spatial awareness and zone discipline.' },
  { code: 'PRS',  label: 'Press',                pillar: 'performance', positions: ['CB'], description: 'Disrupt at the line.' },
  { code: 'PLR',  label: 'Play Recognition (D)', pillar: 'performance', positions: ['CB','S','LB','EDGE','DL'], description: 'Read route combos / run vs pass.' },
];

/* ── Full flat catalog (deduped by code, first def wins) ─────────────── */
const _all: AttributeDef[] = [
  ...PHYSICAL_ATTRIBUTES,
  ...INTANGIBLE_ATTRIBUTES,
  ...QB_ATTRIBUTES,
  ...RB_ATTRIBUTES,
  ...WR_ATTRIBUTES,
  ...TE_ATTRIBUTES,
  ...OL_ATTRIBUTES,
  ...DL_ATTRIBUTES,
  ...CB_S_ATTRIBUTES,
];

const _byCode = new Map<string, AttributeDef>();
for (const a of _all) if (!_byCode.has(a.code)) _byCode.set(a.code, a);
export const ATTRIBUTE_CATALOG: ReadonlyMap<string, AttributeDef> = _byCode;

export function getAttribute(code: string): AttributeDef | undefined {
  return _byCode.get(code);
}

/**
 * Return the attributes relevant to a position, grouped by pillar.
 * Performance attributes are position-filtered; Attributes + Intangibles
 * are universal. Order matches human-readable rendering (SPD first, then
 * ACC, AGI...).
 */
export interface PositionAttributeSet {
  performance: AttributeDef[];
  attributes: AttributeDef[];
  intangibles: AttributeDef[];
}

export function getAttributesForPosition(position: string): PositionAttributeSet {
  const pos = position.toUpperCase();
  const matches = (a: AttributeDef): boolean =>
    a.positions.includes('*') || a.positions.includes(pos);
  return {
    performance: _all.filter(a => a.pillar === 'performance' && matches(a)),
    attributes:  _all.filter(a => a.pillar === 'attributes'  && matches(a)),
    intangibles: _all.filter(a => a.pillar === 'intangibles' && matches(a)),
  };
}
