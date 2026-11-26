import fs from 'node:fs';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { CLIENT_DIST_DIR, PORT } from './config.js';
import { sseHandler } from './events.js';
import { createLabsRouter } from './labs.js';
import { createAdminRouter } from './routes/admin.js';
import { createAuthRouter } from './routes/auth.js';
import { createArtifactsRouter, createChallengesRouter } from './routes/challenges.js';
import { createScoreboardRouter } from './routes/scoreboard.js';
import { createTeamsRouter } from './routes/teams.js';
import { ensureSeeded } from './seed.js';

ensureSeeded();

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false, // Allows inline scripts on interactive CTF Web Labs
  })
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'cuj-ctf-arena' });
});

// Real-time Server-Sent Events stream
app.get('/api/events', sseHandler);

// Core API routes
app.use('/api/auth', createAuthRouter());
app.use('/api/teams', createTeamsRouter());
app.use('/api/challenges', createChallengesRouter());
app.use('/api/artifacts', createArtifactsRouter());
app.use('/api', createScoreboardRouter());
app.use('/api/admin', createAdminRouter());

// Interactive Web, Pwn, and Misc CTF Labs
app.use(createLabsRouter());

// Serve built React frontend if available
if (fs.existsSync(CLIENT_DIST_DIR)) {
  app.use(express.static(CLIENT_DIST_DIR, { dotfiles: 'allow' }));
  app.use((req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path.startsWith('/api/') || req.path.startsWith('/ctf-labs/')) {
      next();
      return;
    }
    res.sendFile('index.html', { root: CLIENT_DIST_DIR, dotfiles: 'allow' });
  });
}

app.listen(PORT, () => {
  console.log(`[CUJ CyberOps CTF] Server running on http://localhost:${PORT}`);
});
