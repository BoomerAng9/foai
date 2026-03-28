/**
 * A.I.M.S. VPS2 Monitoring Agent
 * Collects Docker container stats + host metrics and POSTs them to VPS1
 * at REPORT_INTERVAL ms (default 15 s).
 */
'use strict';

const http   = require('http');
const os     = require('os');
const fs     = require('fs');
const Docker = require('dockerode');
const pino   = require('pino');
const pinoHttp = require('pino-http');

const log    = pino({ level: process.env.LOG_LEVEL || 'info' });
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const VPS1_URL        = process.env.VPS1_METRICS_URL || 'http://10.0.0.1:3001/api/v1/metrics/vps2';
const REPORT_INTERVAL = parseInt(process.env.REPORT_INTERVAL || '15000', 10);
const HOSTNAME        = process.env.HOSTNAME || 'vps2-sandbox';

// ─── Metric collection ──────────────────────────────────────────────────────

function cpuUsage() {
  const cpus = os.cpus();
  let idle = 0, total = 0;
  for (const cpu of cpus) {
    for (const t of Object.values(cpu.times)) total += t;
    idle += cpu.times.idle;
  }
  return Math.round(100 - (idle / total) * 100);
}

function memUsage() {
  const total = os.totalmem();
  const free  = os.freemem();
  return { totalMb: Math.round(total / 1e6), usedMb: Math.round((total - free) / 1e6), pct: Math.round(((total - free) / total) * 100) };
}

function diskUsage() {
  try {
    const stat = fs.statfsSync('/');
    const total = stat.blocks * stat.bsize;
    const free  = stat.bfree  * stat.bsize;
    return { totalGb: +(total / 1e9).toFixed(1), usedGb: +((total - free) / 1e9).toFixed(1) };
  } catch (_) { return { totalGb: 0, usedGb: 0 }; }
}

async function containerStats() {
  try {
    const containers = await docker.listContainers({ all: false });
    return containers.map(c => ({
      id: c.Id.slice(0, 12),
      name: (c.Names[0] || '').replace(/^\//, ''),
      image: c.Image,
      status: c.Status,
    }));
  } catch (_) { return []; }
}

// ─── Report loop ────────────────────────────────────────────────────────────

async function report() {
  const payload = {
    hostname: HOSTNAME,
    ts: new Date().toISOString(),
    cpu: { pct: cpuUsage() },
    mem: memUsage(),
    disk: diskUsage(),
    containers: await containerStats(),
    loadAvg: os.loadavg().map(n => +n.toFixed(2)),
    uptimeS: Math.round(os.uptime()),
  };

  const body = JSON.stringify(payload);
  const url  = new URL(VPS1_URL);
  const opts = {
    hostname: url.hostname,
    port: parseInt(url.port || '3001', 10),
    path: url.pathname,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    timeout: 5000,
  };

  const req = http.request(opts, res => {
    if (res.statusCode >= 400) log.warn({ status: res.statusCode }, 'VPS1 rejected metrics');
  });
  req.on('error', err => log.warn({ err: err.message }, 'Metrics push failed'));
  req.on('timeout', () => { req.destroy(); log.warn('Metrics push timed out'); });
  req.write(body);
  req.end();
}

// ─── Health HTTP server ─────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', hostname: HOSTNAME }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

const PORT = parseInt(process.env.PORT || '4300', 10);
server.listen(PORT, '0.0.0.0', () => log.info({ port: PORT, vps1: VPS1_URL }, 'Monitoring agent started'));

// ─── Start reporting ────────────────────────────────────────────────────────
report().catch(e => log.warn({ err: e.message }, 'Initial report failed'));
setInterval(report, REPORT_INTERVAL);
