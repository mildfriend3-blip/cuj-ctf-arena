import express, { type Router } from 'express';
import { hashPassword, requireAuth, signAuthToken, verifyPassword } from '../auth.js';
import { db, getSetting } from '../db.js';
import { broadcastEvent } from '../events.js';

function loadUserBundle(userId: number) {
  const user = db
    .prepare(
      'SELECT id, username, email, role, department, roll_number, team_id, avatar_seed, created_at FROM users WHERE id = ?'
    )
    .get(userId) as Record<string, unknown> | undefined;
  if (!user) return null;

  let team = null;
  if (user.team_id) {
    const teamRow = db
      .prepare('SELECT id, name, tag, department, motto, invite_code, captain_id, banned, created_at FROM teams WHERE id = ?')
      .get(user.team_id as number) as Record<string, unknown> | undefined;
    if (teamRow) {
      const members = db
        .prepare('SELECT id, username, department, roll_number, avatar_seed FROM users WHERE team_id = ? ORDER BY id ASC')
        .all(teamRow.id as number);
      team = { ...teamRow, members };
    }
  }
  return { user, team };
}

export function createAuthRouter(): Router {
  const router = express.Router();

  router.post('/register', (req, res) => {
    if (getSetting('registration_open', '1') !== '1') {
      res.status(403).json({ error: 'Registration is currently closed by organizers.' });
      return;
    }

    const username = String(req.body?.username || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const department = String(req.body?.department || 'CSE').trim();
    const rollNumber = String(req.body?.rollNumber || '').trim().toUpperCase();

    if (username.length < 3 || username.length > 24 || !/^[a-zA-Z0-9_.-]+$/.test(username)) {
      res.status(400).json({ error: 'Username must be 3-24 characters (letters, digits, _, ., -).' });
      return;
    }
    if (!email.includes('@') || email.length < 5) {
      res.status(400).json({ error: 'Valid university or student email required.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      res.status(409).json({ error: 'Username or email is already registered.' });
      return;
    }

    const pwHash = hashPassword(password);
    const result = db
      .prepare(
        `INSERT INTO users (username, email, password_hash, role, department, roll_number, avatar_seed)
         VALUES (?, ?, ?, 'player', ?, ?, ?)`
      )
      .run(username, email, pwHash, department, rollNumber, username);

    const userId = Number(result.lastInsertRowid);
    const token = signAuthToken(userId);
    const bundle = loadUserBundle(userId);
    broadcastEvent('scoreboard_update', { reason: 'new_user' });
    res.status(201).json({ token, ...bundle });
  });

  router.post('/login', (req, res) => {
    const identifier = String(req.body?.identifier || req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!identifier || !password) {
      res.status(400).json({ error: 'Username/email and password are required.' });
      return;
    }

    const userRow = db
      .prepare('SELECT id, password_hash FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?')
      .get(identifier, identifier) as { id: number; password_hash: string } | undefined;

    if (!userRow || !verifyPassword(password, userRow.password_hash)) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    const token = signAuthToken(userRow.id);
    const bundle = loadUserBundle(userRow.id);
    res.json({ token, ...bundle });
  });

  router.get('/me', requireAuth, (req, res) => {
    const bundle = loadUserBundle(req.user!.id);
    res.json(bundle);
  });

  router.patch('/me', requireAuth, (req, res) => {
    const department = String(req.body?.department || req.user!.department).trim().slice(0, 48);
    const rollNumber = String(req.body?.rollNumber ?? req.user!.roll_number).trim().toUpperCase().slice(0, 32);
    db.prepare('UPDATE users SET department = ?, roll_number = ? WHERE id = ?').run(department, rollNumber, req.user!.id);
    res.json(loadUserBundle(req.user!.id));
  });

  return router;
}
