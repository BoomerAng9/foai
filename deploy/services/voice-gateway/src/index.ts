/**
 * @aims/voice-gateway — service entry.
 *
 * Migrated from the-deploy-platform/DEPLOY/services/voice-gateway/ per
 * the project_deploy_platform_in_foai canon. v0.2.0 replaces the
 * ephemeral-token stub with JWT-based minting (see inworld-realtime.ts).
 */

import express, { Express } from 'express';
import cors from 'cors';
import multer from 'multer';
import Groq from 'groq-sdk';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { config } from 'dotenv';
import {
  mintEphemeralCredential,
  dispatchSpinnerTool,
  MissingJwtSecretError,
  SPINNER_BASE_TOOLS,
  type SpinnerSessionOptions,
  type ToolDispatchRequest,
} from './inworld-realtime.js';
import { enqueueClone, getCloneJob } from './inworld-voice-clone.js';

config();

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const app: Express = express();
const PORT = parseInt(process.env.PORT || '3002', 10);

// Groq client (optional — STT fails 503 if absent)
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/webm',
      'audio/ogg',
      'audio/flac',
      'audio/m4a',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  },
});

// ==============================================================================
// Routes
// ==============================================================================

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'voice-gateway',
    version: '0.2.0',
    groqConfigured: groq !== null,
    inworldApiKeyConfigured: !!process.env.INWORLD_API_KEY,
    inworldJwtSecretConfigured: !!process.env.INWORLD_JWT_SECRET,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Spinner: mint a short-lived Inworld Realtime session config.
 *
 * Returns a Bearer JWT (client_token) the browser uses as the WSS
 * Authorization header. The root INWORLD_API_KEY is never returned.
 * Requires INWORLD_JWT_SECRET to be configured — refuses with 503
 * otherwise (fails closed rather than regressing to the pre-0.2.0 leak).
 */
app.post('/v1/spinner/session', async (req, res) => {
  try {
    const opts = req.body as SpinnerSessionOptions;
    if (!opts?.surface) {
      res.status(400).json({ error: 'surface required' });
      return;
    }
    const cred = mintEphemeralCredential(opts);
    res.json({
      wss_url: cred.wss_url,
      model: cred.model,
      session_config: cred.session_config,
      client_token: cred.client_token,
      expires_at: cred.expires_at,
      session_id: cred.session_id,
    });
  } catch (err) {
    if (err instanceof MissingJwtSecretError) {
      logger.error({ msg: 'spinner session refused — INWORLD_JWT_SECRET missing' });
      res.status(503).json({
        error: 'ephemeral credential minting disabled',
        details: 'INWORLD_JWT_SECRET not configured on the voice-gateway',
      });
      return;
    }
    logger.error({ msg: 'spinner session mint failed', err });
    res.status(500).json({
      error: 'session mint failed',
      details: err instanceof Error ? err.message : 'unknown',
    });
  }
});

/**
 * Spinner: server-side tool dispatch. Browser posts function_call events
 * from Inworld Realtime and receives the tool_output payload to send back.
 */
app.post('/v1/spinner/tool', async (req, res) => {
  try {
    const body = req.body as ToolDispatchRequest;
    if (!body?.tool_name || !body?.call_id) {
      res.status(400).json({ error: 'tool_name and call_id required' });
      return;
    }
    const result = await dispatchSpinnerTool(body);
    res.json(result);
  } catch (err) {
    logger.error({ msg: 'spinner tool dispatch failed', err });
    res.status(500).json({ error: 'tool dispatch failed' });
  }
});

/**
 * Spinner: list the base tool registry for client-side introspection.
 */
app.get('/v1/spinner/tools', (_req, res) => {
  res.json({ tools: SPINNER_BASE_TOOLS });
});

/**
 * Async voice cloning via Inworld. Returns a job_id immediately; poll
 * /v1/voice/clone/:job_id for status. Never blocks.
 */
app.post('/v1/voice/clone/async', (req, res) => {
  const { display_name, sample_url, language } = req.body ?? {};
  if (!display_name || !sample_url) {
    res.status(400).json({ error: 'display_name and sample_url required' });
    return;
  }
  const job = enqueueClone({ display_name, sample_url, language });
  res.status(202).json(job);
});

app.get('/v1/voice/clone/:jobId', (req, res) => {
  const job = getCloneJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'job not found' });
    return;
  }
  res.json(job);
});

/**
 * Transcribe audio file to text via Groq Whisper.
 */
app.post('/v1/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!groq) {
      res.status(503).json({ error: 'Groq not configured' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }
    const { buffer, mimetype, originalname } = req.file;
    const language = (req.body.language as string) || 'en';

    logger.info({
      msg: 'Transcription request',
      filename: originalname,
      mimetype,
      size: buffer.length,
      language,
    });

    const file = new File(
      [new Uint8Array(buffer)],
      originalname || 'audio.mp3',
      { type: mimetype },
    );

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3',
      language,
      response_format: 'json',
    });

    logger.info({ msg: 'Transcription complete', textLength: transcription.text.length });

    res.json({
      text: transcription.text,
      language,
      model: 'whisper-large-v3',
    });
  } catch (error) {
    logger.error({ msg: 'Transcription error', error });
    res.status(500).json({
      error: 'Transcription failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/v1/transcribe/detailed', upload.single('audio'), async (req, res) => {
  try {
    if (!groq) {
      res.status(503).json({ error: 'Groq not configured' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }

    const { buffer, mimetype, originalname } = req.file;
    const language = (req.body.language as string) || 'en';

    const file = new File(
      [new Uint8Array(buffer)],
      originalname || 'audio.mp3',
      { type: mimetype },
    );

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3',
      language,
      response_format: 'verbose_json',
    });

    res.json(transcription);
  } catch (error) {
    logger.error({ msg: 'Detailed transcription error', error });
    res.status(500).json({
      error: 'Transcription failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ==============================================================================
// Error handling
// ==============================================================================

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logger.error({ msg: 'Unhandled error', error: err });
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  },
);

// ==============================================================================
// Start server
// ==============================================================================

app.listen(PORT, '0.0.0.0', () => {
  logger.info({
    msg: 'Voice Gateway started',
    version: '0.2.0',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    groqConfigured: groq !== null,
    inworldJwtSecretConfigured: !!process.env.INWORLD_JWT_SECRET,
  });
});

export default app;
