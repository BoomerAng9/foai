/**
 * TPS_Report_Ang HTTP server.
 * Express app + middleware. The HTTP entry point lives in index.ts;
 * this file builds the app for testability and reuse.
 */

import express, { type Express } from 'express';
import { pricingRouter } from './routes/pricing.js';

export function buildApp(): Express {
  const app = express();

  // JSON body parsing
  app.use(express.json({ limit: '256kb' }));

  // CORS — permissive for local dev, tighten in production
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.TPS_REPORT_ANG_CORS_ORIGIN || '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    next();
  });

  // Top-level health
  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'tps-report-ang', version: '0.1.0' });
  });

  // Pricing routes mounted at /api/pricing
  app.use('/api/pricing', pricingRouter);

  // 404 fallback
  app.use((_req, res) => {
    res.status(404).json({ error: 'not found' });
  });

  return app;
}
