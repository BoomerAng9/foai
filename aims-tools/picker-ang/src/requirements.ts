/**
 * Derive capability tags from free-text CTQs.
 *
 * This is a keyword-map stub. It's deterministic, cheap, and good enough
 * to get Picker_Ang off the ground while we mature the LLM-extraction
 * path. The mapping covers the high-frequency capability tags used in
 * the seeded tool warehouse (`@aims/tool-warehouse/seed-tools`).
 *
 * Future: swap to Gemini 3.1 Flash with a strict JSON output schema.
 */

const CAPABILITY_RULES: Array<{ pattern: RegExp; capabilities: string[] }> = [
  { pattern: /\b(scrape|scraping|web data|crawl|crawler)\b/i,
    capabilities: ['web_scraping', 'browser_automation'] },
  { pattern: /\b(form|fill|submit|automat)\b/i,
    capabilities: ['form_automation', 'browser_automation'] },
  { pattern: /\b(code|build|plug|generate|implement)\b/i,
    capabilities: ['code_generation', 'plug_construction'] },
  { pattern: /\b(research|investigate|analyze|market)\b/i,
    capabilities: ['research', 'synthesis'] },
  { pattern: /\b(voice|speak|tts|stt|audio|transcri)\b/i,
    capabilities: ['voice', 'stt', 'tts'] },
  { pattern: /\b(video|film|clip|edit)\b/i,
    capabilities: ['video_analysis', 'multimodal'] },
  { pattern: /\b(content|article|blog|copy|marketing|email)\b/i,
    capabilities: ['content_generation', 'multilingual'] },
  { pattern: /\b(collaborat|team|multi.{0,5}agent|coord)\b/i,
    capabilities: ['multi_agent', 'collaboration'] },
  { pattern: /\b(storage|store|save|archive|bucket)\b/i,
    capabilities: ['storage'] },
  { pattern: /\b(presentat|slide|deck|pitch)\b/i,
    capabilities: ['presentation'] },
  { pattern: /\b(database|sql|postgres|neon|supabase)\b/i,
    capabilities: ['persistence'] },
  { pattern: /\b(orchestr|route|dispatch|workflow)\b/i,
    capabilities: ['orchestration', 'multi_tool'] },
  { pattern: /\b(timeline|audit|log|ledger|trace)\b/i,
    capabilities: ['logging', 'audit_trail'] },
  { pattern: /\b(dataset|rag|retriev|embed|vector)\b/i,
    capabilities: ['rag', 'dataset_management'] },
  { pattern: /\b(terminal|cli|shell|command.{0,3}line)\b/i,
    capabilities: ['cli_automation', 'terminal'] },
  { pattern: /\b(bridge|api|integrate|connector|webhook)\b/i,
    capabilities: ['api_bridge', 'integration'] },
];

export interface DerivedRequirements {
  capabilities: string[];
  triggered: Array<{ pattern: string; capabilities: string[] }>;
}

export function deriveRequirements(rawCtqs: readonly string[]): DerivedRequirements {
  const haystack = rawCtqs.join(' \n ');
  const triggered: DerivedRequirements['triggered'] = [];
  const collected = new Set<string>();

  for (const rule of CAPABILITY_RULES) {
    if (rule.pattern.test(haystack)) {
      triggered.push({ pattern: rule.pattern.source, capabilities: rule.capabilities });
      for (const c of rule.capabilities) collected.add(c);
    }
  }

  return {
    capabilities: [...collected],
    triggered,
  };
}
