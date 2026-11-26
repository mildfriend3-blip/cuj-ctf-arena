import fs from 'node:fs';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { CLIENT_DIST_DIR, IS_VERCEL } from './config.js';
import { isPersistentRemoteDb } from './db.js';
import { sseHandler } from './events.js';
import { createLabsRouter } from './labs.js';
import { createAdminRouter } from './routes/admin.js';
import { createAuthRouter } from './routes/auth.js';
import { createArtifactsRouter, createChallengesRouter } from './routes/challenges.js';
import { createScoreboardRouter } from './routes/scoreboard.js';
import { createTeamsRouter } from './routes/teams.js';
import { ensureSeeded } from './seed.js';

export const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false, // Allows inline scripts on interactive CTF Web Labs
  })
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Ensure database schema and seed data exist on first cold start
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  await ensureSeeded();
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'cuj-ctf-arena',
    runtime: IS_VERCEL ? 'vercel-serverless' : 'node-server',
    dbMode: isPersistentRemoteDb ? 'turso' : IS_VERCEL ? 'ephemeral-tmp' : 'sqlite-local',
  });
});

app.get('/api/events', sseHandler);

app.use('/api/auth', createAuthRouter());
app.use('/api/teams', createTeamsRouter());
app.use('/api/challenges', createChallengesRouter());
app.use('/api/artifacts', createArtifactsRouter());
app.use('/api', createScoreboardRouter());
app.use('/api/admin', createAdminRouter());

// Interactive Web, Pwn, and Misc CTF Labs
app.use(createLabsRouter());

// Serve built React frontend locally / in Docker (Vercel serves client/dist via CDN)
if (!IS_VERCEL && fs.existsSync(CLIENT_DIST_DIR)) {
  app.use(express.static(CLIENT_DIST_DIR, { dotfiles: 'allow' }));
  app.use((req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path.startsWith('/api/') || req.path.startsWith('/ctf-labs/')) {
      next();
      return;
    }
    res.sendFile('index.html', { root: CLIENT_DIST_DIR, dotfiles: 'allow' });
  });
}

// Unified error handler for async Express 5 routes
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[CUJ CTF Error]', err);
  res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
});
