/**
 * @aims/tps-report-ang
 * ====================
 * TPS_Report_Ang — A.I.M.S. Pricing Overseer Node service.
 *
 * Real pencil pusher under Boomer_CFO. Deploys a team of Lil_Hawks
 * to watch fee changes, monitor user tokens, assist with LUC, and
 * audit financial transactions. Has the @SPEAKLY skill capability.
 *
 * Renamed from TPS_Ang on 2026-04-08.
 *
 * Public surfaces:
 *   - HTTP service (this entrypoint, default port 7800)
 *   - Pure functions in services/pricing-overseer.ts (importable)
 *   - Future: MCP tool wrapping for Port Authority
 *   - Future: Direct import from SmelterOS apps
 */

import { buildApp } from './server.js';

// Re-export the pure service so other packages can import without HTTP
export * from './services/pricing-overseer.js';
export { promptToPlanWithLlm } from './services/prompt-to-plan-llm.js';
export { buildApp } from './server.js';

// HTTP entrypoint
const PORT = Number(process.env.TPS_REPORT_ANG_PORT ?? 7800);

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = buildApp();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[tps-report-ang] listening on :${PORT}`);
    // eslint-disable-next-line no-console
    console.log(`[tps-report-ang] try GET http://localhost:${PORT}/api/pricing/health`);
  });
}
