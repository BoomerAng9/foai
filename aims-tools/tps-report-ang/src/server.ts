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

  // CORS — origin allowlist. Defaults to FOAI production surfaces + localhost.
  // Override with TPS_REPORT_ANG_CORS_ORIGINS (comma-separated) for staging or
  // additional trusted origins. NEVER fall back to '*' — that opens the pricing
  // data to any web origin.
  const defaultAllowedOrigins = [
    'https://foai.cloud',
    'https://cti.foai.cloud',
    'https://deploy.foai.cloud',
    'https://perform.foai.cloud',
    'https://sqwaadrun.foai.cloud',
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  const envOrigins = (process.env.TPS_REPORT_ANG_CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowedOrigins = new Set<string>([...defaultAllowedOrigins, ...envOrigins]);

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
    }
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
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
