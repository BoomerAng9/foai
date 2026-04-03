export type TIETier = 'PRIME' | 'A_PLUS' | 'A' | 'A_MINUS' | 'B_PLUS' | 'B' | 'B_MINUS' | 'C_PLUS' | 'C';
export type Pool = 'NFL_PROSPECT' | 'COLLEGE' | 'HIGH_SCHOOL';
export type Trend = 'UP' | 'DOWN' | 'STEADY' | 'NEW';

export interface PerformanceInput {
  offenseYards?: number;
  tdIntRatio?: number;
  efficiency?: number;
  epaPerPlay?: number;
  successRate?: number;
  tackles?: number;
  sacks?: number;
  interceptions?: number;
  pffGrade?: number;
  specialTeamsGrade?: number;
}

export interface AttributesInput {
  fortyYard?: number;
  threeCone?: number;
  shuttle?: number;
  benchPress?: number;
  height?: number;
  weight?: number;
  wingspan?: number;
  verticalJump?: number;
  broadJump?: number;
}

export interface IntangiblesInput {
  footballIQ?: number;
  workEthic?: number;
  competitiveness?: number;
  leadership?: number;
  offFieldCharacter?: number;
}

export interface TIEResult {
  score: number;
  grade: string;
  tier: TIETier;
  label: string;
  draftContext: string;
  badgeColor: string;
  components: {
    performance: number;
    attributes: number;
    intangibles: number;
  };
}

export interface Prospect {
  id: string;
  name: string;
  position: string;
  school: string;
  classYear: string;
  pool: Pool;
  height?: string;
  weight?: number;
  state?: string;
  conference?: string;
  tieScore?: number;
  tieGrade?: string;
  tieTier?: string;
  trend?: Trend;
  overallRank?: number;
  positionRank?: number;
  projectedRound?: number;
  scoutingSummary?: string;
  strengths?: string;
  weaknesses?: string;
  nflComparison?: string;
  analystNotes?: string;
  stats?: Record<string, string | number>;
}
