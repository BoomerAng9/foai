/**
 * Stitch MCP — shared types
 * =============================
 * Data contracts for the Grammar → Scenarios → Open Mind →
 * Iller_Ang → Stitch → ACHEEVY pipeline.
 */

export type ScreenType =
  | 'landing'
  | 'dashboard'
  | 'plug-page'
  | 'analyst-feed'
  | 'forecast'
  | 'studio'
  | 'custom';

export type Theme =
  | 'broadcast-light'   // navy + red + white, PFF/ESPN inspired
  | 'studio-dark'       // dark navy + gold, Void-Caster aesthetic
  | 'editorial'         // white + serif, GQ/Athletic inspired
  | 'cosmic-scholar';   // Bun-E violet + navy

export interface DesignBrief {
  /** Plain-language description of what to build (filtered by Grammar) */
  intent: string;
  /** Scenarios tile selection */
  screenType: ScreenType;
  /** Theme token */
  theme: Theme;
  /** Required sections in the page */
  sections: string[];
  /** Hard constraints (must include / must avoid) */
  constraints: {
    mustInclude?: string[];
    mustAvoid?: string[];
  };
  /** Target vertical — drives which knowledge library feeds in */
  vertical?: 'athletics' | 'workforce' | 'agents' | 'universal';
  /** Whether Open Mind is active (3-variant brainstorm) */
  openMindEnabled: boolean;
}

export interface DesignVariant {
  id: string;
  approach: 'conventional' | 'contrarian' | 'unexpected';
  briefSummary: string;
  stitchDesignId?: string;
  previewUrl?: string;
  htmlExport?: string;
  reactExport?: string;
  createdAt: string;
}

export interface CurationResult {
  verdict: 'APPROVED' | 'REFINE' | 'REJECT';
  feedback: string;
  refinementBrief?: string;
  violatedRules?: string[];
}

export interface StitchGenerationResult {
  designId: string;
  previewUrl: string | null;
  error?: string;
}
