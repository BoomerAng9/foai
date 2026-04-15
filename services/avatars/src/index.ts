import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { uploadHandler } from './handlers/upload.js';
import { moderateHandler } from './handlers/moderate.js';

const app = new Hono();

app.options('*', c => c.body(null, 204, {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}));

app.use('*', async (c, next) => {
  await next();
  c.res.headers.set('Access-Control-Allow-Origin', '*');
});

app.get('/health', c => c.json({
  status: 'healthy',
  service: 'avatars',
  environment: process.env.ENVIRONMENT || 'production',
  timestamp: new Date().toISOString(),
  version: '1.0.0',
}));

app.post('/api/avatars/upload', uploadHandler);
app.post('/api/avatars/moderate', moderateHandler);

app.notFound(c => c.json({ error: 'Not found' }, 404));
app.onError((err, c) => {
  console.error('[avatars] unhandled', err);
  return c.json({ error: 'Internal server error' }, 500);
});

const port = Number(process.env.PORT ?? 8080);
serve({ fetch: app.fetch, port }, info => {
  console.log(`[avatars] listening on :${info.port}`);
});
