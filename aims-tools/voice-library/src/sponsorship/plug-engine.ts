/**
 * @aims/voice-library/sponsorship — plug engine
 *
 * The cross-pollination engine. Given a SPEAKER (any character in any
 * vertical) and a BRAND (any vertical's brand), generate a plug script
 * shaped by the speaker's dialect and the brand's approved claims.
 *
 * Three plug formats:
 *   - 'sponsor-read'   — formal pre/mid/post-roll spot, length-targeted
 *   - 'organic-plug'   — woven into surrounding content, conversational
 *   - 'brand-mention'  — quick attribution, footer-style ("powered by X")
 *
 * The output is a SCRIPT (text). Voice rendering happens downstream
 * via Gemini 3.1 Flash Live or a clone resolved through the
 * `registry/character-voices.ts` registry.
 *
 * The script always passes through `applyDialect()` post-generation so
 * the speaker's vocabulary swaps land. The LLM that generates the
 * variable middle-section is steered by `getDialectPromptRules()` so
 * the writing arrives already dialect-aware.
 */

import type { DialectGuide } from '../dialect/dialect-guides.js';
import {
  applyDialect,
  getDialectGuide,
  getDialectPromptRules,
} from '../dialect/dialect-guides.js';
import type { BrandIdentity, ProductSku } from './brands.js';
import { getBrand, getSku, getSkusByBrand } from './brands.js';

export type PlugFormat = 'sponsor-read' | 'organic-plug' | 'brand-mention';

export interface PlugRequest {
  /** Character doing the talking. Must exist in dialect-guides registry. */
  speaker_character_id: string;
  /** Brand being plugged. Must exist in brands registry. */
  brand_id: string;
  /** Optional product call-outs (sku_ids). */
  sku_ids?: string[];
  /** Plug format. Determines length and structure. */
  format: PlugFormat;
  /** Target length in seconds. Used for sponsor-read sizing. Default 30. */
  length_seconds?: 15 | 30 | 60;
  /** Optional context — what's happening in the surrounding content. */
  context?: string;
}

export interface PlugScript {
  speaker_character_id: string;
  speaker_display_name: string;
  speaker_register: string;
  brand_id: string;
  brand_display_name: string;
  format: PlugFormat;
  /** The dialect-applied text the TTS should read. */
  script_text: string;
  /** System-prompt fragment so the LLM that fills in any variable section
      writes in the speaker's register. */
  prompt_rules: string;
  /** Approximate seconds at standard read speed (~145 words/min). */
  duration_estimate_seconds: number;
  /** Forbidden topics that the renderer must screen against before delivery. */
  forbidden_topics: string[];
  /** Required attribution that must remain in the final delivery. */
  attribution_required: string;
}

export class PlugError extends Error {}

// ─────────────────────────────────────────────────────────────────────────
// Generators per format
// ─────────────────────────────────────────────────────────────────────────

function generateSponsorRead(
  speaker: DialectGuide,
  brand: BrandIdentity,
  skus: ProductSku[],
  lengthSeconds: number,
): string {
  // Sponsor-read template (in standard English; applyDialect runs after)
  const opener = pickFromList(speaker.sampleLines, 0).split(' — ')[0] + ` — and let me tell ya about ${brand.display_name}.`;
  const positioning = `${brand.display_name} — ${brand.positioning_one_liner}`;
  const claims = pickFromList(brand.approved_pitches, 0);
  const sku = skus[0];
  const product = sku
    ? `Try the ${sku.display_name}: ${sku.approved_one_liners[0] ?? sku.description}.`
    : '';
  const cta = `Find them at ${brand.primary_call_to_action}.`;
  const attribution = `${brand.attribution_required}.`;

  const sections = [opener, positioning, claims, product, cta, attribution]
    .filter(Boolean)
    .join(' ');

  // Trim to length budget (rough): ~145 wpm, 60 sec = ~145 words
  const wordBudget = Math.max(20, Math.round((lengthSeconds / 60) * 145));
  const words = sections.split(/\s+/);
  const trimmed = words.slice(0, wordBudget).join(' ');

  return trimmed;
}

function generateOrganicPlug(
  speaker: DialectGuide,
  brand: BrandIdentity,
  skus: ProductSku[],
  context?: string,
): string {
  // Organic plugs weave the brand into surrounding content. Returns a
  // dialect-agnostic sentence that the post-process applyDialect shapes.
  const sku = skus[0];
  const contextPrefix = context ? `${context} ` : '';
  if (sku) {
    return `${contextPrefix}I had a ${sku.display_name} from ${brand.display_name} this morning — ${sku.approved_one_liners[0] ?? sku.description}`;
  }
  return `${contextPrefix}${brand.display_name} — ${brand.positioning_one_liner}`;
}

function generateBrandMention(brand: BrandIdentity): string {
  return `${brand.attribution_required}.`;
}

// ─────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────

export function generatePlug(req: PlugRequest): PlugScript {
  const speaker = getDialectGuide(req.speaker_character_id);
  if (!speaker) {
    throw new PlugError(`Unknown speaker character: ${req.speaker_character_id}`);
  }
  const brand = getBrand(req.brand_id);
  if (!brand) {
    throw new PlugError(`Unknown brand: ${req.brand_id}`);
  }

  const skus: ProductSku[] = (req.sku_ids ?? [])
    .map((id) => getSku(id))
    .filter((s): s is ProductSku => s !== undefined);

  const lengthSeconds = req.length_seconds ?? 30;
  let rawText = '';
  switch (req.format) {
    case 'sponsor-read':
      rawText = generateSponsorRead(speaker, brand, skus, lengthSeconds);
      break;
    case 'organic-plug':
      rawText = generateOrganicPlug(speaker, brand, skus, req.context);
      break;
    case 'brand-mention':
      rawText = generateBrandMention(brand);
      break;
    default:
      throw new PlugError(`Unknown plug format: ${req.format}`);
  }

  // Apply the speaker's dialect on top of the brand-templated script.
  const scriptText = applyDialect(rawText, speaker.cast_id);

  // Words to seconds estimate at 145 wpm
  const wordCount = scriptText.split(/\s+/).filter(Boolean).length;
  const durationEstimateSeconds = Math.round((wordCount / 145) * 60);

  return {
    speaker_character_id: speaker.cast_id,
    speaker_display_name: speaker.display_name,
    speaker_register: speaker.register,
    brand_id: brand.brand_id,
    brand_display_name: brand.display_name,
    format: req.format,
    script_text: scriptText,
    prompt_rules: getDialectPromptRules(speaker.cast_id),
    duration_estimate_seconds: durationEstimateSeconds,
    forbidden_topics: brand.forbidden_topics,
    attribution_required: brand.attribution_required,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Convenience for ecosystem fan-out
// ─────────────────────────────────────────────────────────────────────────

/**
 * Generate sponsor reads for a brand from EVERY speaker across the ecosystem.
 * Use case: spin up a fresh sponsor read in each Per|Form analyst's voice
 * for a Coastal product launch.
 */
export function generateAllSponsorReads(
  brandId: string,
  skuIds: string[] = [],
  lengthSeconds: 15 | 30 | 60 = 30,
  speakerVerticalFilter?: DialectGuide['vertical'],
): PlugScript[] {
  // We need the speaker list — import lazily to avoid a circular dependency
  // on dialect-guides at module load.
  const guides = require('../dialect/dialect-guides.js') as typeof import('../dialect/dialect-guides.js');
  const speakers = Object.values(guides.DIALECT_REGISTRY).filter(
    (g) => !speakerVerticalFilter || g.vertical === speakerVerticalFilter,
  );
  return speakers.map((s) =>
    generatePlug({
      speaker_character_id: s.cast_id,
      brand_id: brandId,
      sku_ids: skuIds,
      format: 'sponsor-read',
      length_seconds: lengthSeconds,
    }),
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function pickFromList<T>(list: T[], idx: number): T {
  return list[Math.min(idx, list.length - 1)] ?? list[0];
}

export { getSkusByBrand };
