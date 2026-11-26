import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type Router } from 'express';
import { optionalAuth, requireAuth } from '../auth.js';
import { ARTIFACTS_DIR } from '../config.js';
import { db, getAllSettings } from '../db.js';
import { broadcastEvent } from '../events.js';
import { getChallengePointMap } from '../scoring.js';

// Simple in-memory rate limit for flag submissions: max 10 tries per 60s per user
const submissionRateWindow = new Map<number, number[]>();

function timingSafeCompareFlag(submitted: string, actual: string, caseSensitive: boolean): boolean {
  const a = Buffer.from(caseSensitive ? submitted.trim() : submitted.trim().toLowerCase(), 'utf8');
  const b = Buffer.from(caseSensitive ? actual.trim() : actual.trim().toLowerCase(), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createChallengesRouter(): Router {
  const router = express.Router();

  router.get('/', optionalAuth, (req, res) => {
    const isAdmin = req.user?.role === 'admin';
    const settings = getAllSettings();
    const { solveCounts, firstBloodByChallenge, pointsMap } = getChallengePointMap(isAdmin);

    const rows = db
      .prepare(
        `SELECT id, slug, title, category, difficulty, description, author,
                initial_points, min_points, decay, is_dynamic, first_blood_bonus,
                lab_type, lab_url, artifacts_json, tags_json, writeup, published, sort_order
         FROM challenges
         ${isAdmin ? '' : 'WHERE published = 1'}
         ORDER BY sort_order ASC, id ASC`
      )
      .all() as Array<Record<string, unknown>>;

    const teamId = req.user?.team_id || null;
    const teamSolvedIds = new Set<number>();
    const unlockedHintIds = new Set<number>();

    if (teamId) {
      const solvedRows = db.prepare('SELECT challenge_id FROM solves WHERE team_id = ?').all(teamId) as Array<{ challenge_id: number }>;
      solvedRows.forEach((r) => teamSolvedIds.add(r.challenge_id));
      const hintRows = db.prepare('SELECT hint_id FROM hint_unlocks WHERE team_id = ?').all(teamId) as Array<{ hint_id: number }>;
      hintRows.forEach((r) => unlockedHintIds.add(r.hint_id));
    }

    const teamNames = new Map<number, string>();
    const tRows = db.prepare('SELECT id, name FROM teams').all() as Array<{ id: number; name: string }>;
    tRows.forEach((t) => teamNames.set(t.id, t.name));

    const allHints = db
      .prepare('SELECT id, challenge_id, order_idx, content, cost FROM hints ORDER BY order_idx ASC, id ASC')
      .all() as Array<{ id: number; challenge_id: number; order_idx: number; content: string; cost: number }>;

    const hintsByChallenge = new Map<number, Array<{ id: number; order_idx: number; cost: number; unlocked: boolean; content?: string }>>();
    for (const h of allHints) {
      const unlocked = isAdmin || unlockedHintIds.has(h.id);
      const list = hintsByChallenge.get(h.challenge_id) || [];
      list.push({
        id: h.id,
        order_idx: h.order_idx,
        cost: h.cost,
        unlocked,
        content: unlocked ? h.content : undefined,
      });
      hintsByChallenge.set(h.challenge_id, list);
    }

    const writeupsUnlocked = settings.writeups_unlocked === '1';

    const challenges = rows.map((c) => {
      const id = Number(c.id);
      const solvedByTeam = teamSolvedIds.has(id);
      const fb = firstBloodByChallenge.get(id);
      return {
        id,
        slug: c.slug,
        title: c.title,
        category: c.category,
        difficulty: c.difficulty,
        description: c.description,
        author: c.author,
        points: pointsMap.get(id) || Number(c.initial_points),
        initialPoints: Number(c.initial_points),
        minPoints: Number(c.min_points),
        decay: Number(c.decay),
        isDynamic: Number(c.is_dynamic) === 1,
        firstBloodBonus: Number(c.first_blood_bonus),
        solveCount: solveCounts.get(id) || 0,
        firstBloodTeam: fb ? teamNames.get(fb.team_id) || null : null,
        solvedByTeam,
        labType: c.lab_type,
        labUrl: c.lab_url,
        artifacts: JSON.parse(String(c.artifacts_json || '[]')),
        tags: JSON.parse(String(c.tags_json || '[]')),
        hints: hintsByChallenge.get(id) || [],
        writeup: isAdmin || writeupsUnlocked || solvedByTeam ? String(c.writeup || '') : null,
        published: Number(c.published) === 1,
      };
    });

    res.json({ challenges });
  });

  router.get('/:id/solves', optionalAuth, (req, res) => {
    const chId = Number(req.params.id);
    const settings = getAllSettings();
    const isAdmin = req.user?.role === 'admin';
    const frozen = settings.scoreboard_frozen === '1' && !isAdmin;
    const freezeAt = settings.freeze_at || '';

    let solves = db
      .prepare(
        `SELECT s.id, t.id as team_id, t.name as team_name, t.tag as team_tag,
                u.username as solved_by, s.is_first_blood, s.bonus_points, s.solved_at
         FROM solves s
         JOIN teams t ON t.id = s.team_id
         JOIN users u ON u.id = s.user_id
         WHERE s.challenge_id = ? AND t.banned = 0
         ORDER BY s.solved_at ASC, s.id ASC`
      )
      .all(chId) as Array<Record<string, unknown>>;

    if (frozen && freezeAt) {
      solves = solves.filter((s) => String(s.solved_at) <= freezeAt);
    }
    res.json({ solves });
  });

  router.post('/:id/submit', requireAuth, (req, res) => {
    const chId = Number(req.params.id);
    const submittedFlag = String(req.body?.flag || '').trim();
    const settings = getAllSettings();

    if (settings.status === 'upcoming') {
      res.status(403).json({ error: 'Competition has not started yet.' });
      return;
    }
    if (settings.status === 'paused') {
      res.status(403).json({ error: 'Competition submissions are temporarily paused by organizers.' });
      return;
    }
    if (settings.status === 'ended') {
      res.status(403).json({ error: 'Competition has ended; flag submissions are closed.' });
      return;
    }
    if (!req.user!.team_id) {
      res.status(400).json({ error: 'Join or create a team in Team Hub before submitting flags.' });
      return;
    }
    if (!submittedFlag) {
      res.status(400).json({ error: 'Please enter a flag before submitting.' });
      return;
    }

    // Rate limit check (max 10 submissions per 60s per user)
    const nowMs = Date.now();
    const history = (submissionRateWindow.get(req.user!.id) || []).filter((ts) => nowMs - ts < 60000);
    if (history.length >= 10) {
      res.status(429).json({ error: 'Rate limit exceeded (max 10 flag attempts per minute). Slow down!' });
      return;
    }
    history.push(nowMs);
    submissionRateWindow.set(req.user!.id, history);

    const team = db.prepare('SELECT id, name, banned FROM teams WHERE id = ?').get(req.user!.team_id) as
      | { id: number; name: string; banned: number }
      | undefined;
    if (!team || team.banned) {
      res.status(403).json({ error: 'Your team is suspended from submitting flags.' });
      return;
    }

    const ch = db
      .prepare(
        'SELECT id, title, category, flag_value, flag_case_sensitive, first_blood_bonus, published FROM challenges WHERE id = ?'
      )
      .get(chId) as
      | {
          id: number;
          title: string;
          category: string;
          flag_value: string;
          flag_case_sensitive: number;
          first_blood_bonus: number;
          published: number;
        }
      | undefined;

    if (!ch || (ch.published !== 1 && req.user!.role !== 'admin')) {
      res.status(404).json({ error: 'Challenge not found.' });
      return;
    }

    const alreadySolved = db
      .prepare('SELECT id FROM solves WHERE challenge_id = ? AND team_id = ?')
      .get(ch.id, team.id);
    if (alreadySolved) {
      res.status(409).json({ error: 'Your team has already solved this challenge!' });
      return;
    }

    const isCorrect = timingSafeCompareFlag(submittedFlag, ch.flag_value, ch.flag_case_sensitive === 1);
    const ip = req.ip || req.socket.remoteAddress || '';

    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare(
        'INSERT INTO submissions (challenge_id, team_id, user_id, submitted_flag, is_correct, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(ch.id, team.id, req.user!.id, isCorrect ? '[VERIFIED]' : submittedFlag.slice(0, 120), isCorrect ? 1 : 0, ip);

      if (!isCorrect) {
        db.exec('COMMIT');
        res.status(400).json({ correct: false, message: 'Incorrect flag. Keep digging!' });
        return;
      }

      const existingSolve = db
        .prepare(
          `SELECT s.id FROM solves s
           JOIN teams t ON t.id = s.team_id
           WHERE s.challenge_id = ? AND t.banned = 0
           LIMIT 1`
        )
        .get(ch.id);

      const isFirstBlood = !existingSolve;
      const bonus = isFirstBlood ? ch.first_blood_bonus : 0;
      const solvedAt = new Date().toISOString();

      db.prepare(
        'INSERT INTO solves (challenge_id, team_id, user_id, is_first_blood, bonus_points, solved_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(ch.id, team.id, req.user!.id, isFirstBlood ? 1 : 0, bonus, solvedAt);

      if (isFirstBlood) {
        db.prepare('INSERT INTO announcements (title, body, severity, created_by) VALUES (?, ?, ?, ?)').run(
          `FIRST BLOOD: ${ch.title}`,
          `${team.name} (${req.user!.username}) drew First Blood on "${ch.title}" [${ch.category}] (+${bonus} bonus pts)!`,
          'first_blood',
          'Scoring Engine'
        );
      }

      db.exec('COMMIT');

      const { pointsMap } = getChallengePointMap(false);
      const awardedPoints = (pointsMap.get(ch.id) || 100) + bonus;

      broadcastEvent(isFirstBlood ? 'first_blood' : 'solve', {
        challengeId: ch.id,
        challengeTitle: ch.title,
        category: ch.category,
        teamId: team.id,
        teamName: team.name,
        username: req.user!.username,
        isFirstBlood,
        bonus,
        points: awardedPoints,
        solvedAt,
      });
      broadcastEvent('scoreboard_update', { reason: 'solve', challengeId: ch.id });

      res.json({
        correct: true,
        isFirstBlood,
        bonus,
        points: awardedPoints,
        message: isFirstBlood
          ? `FIRST BLOOD! +${awardedPoints} pts awarded to ${team.name}!`
          : `Flag accepted! +${awardedPoints} pts awarded to ${team.name}.`,
      });
    } catch (err) {
      db.exec('ROLLBACK');
      res.status(500).json({ error: err instanceof Error ? err.message : 'Submission processing failed.' });
    }
  });

  router.post('/:id/hints/:hintId/unlock', requireAuth, (req, res) => {
    if (!req.user!.team_id) {
      res.status(400).json({ error: 'Join or create a team to unlock shared team hints.' });
      return;
    }
    const chId = Number(req.params.id);
    const hintId = Number(req.params.hintId);
    const hint = db
      .prepare('SELECT id, challenge_id, content, cost FROM hints WHERE id = ? AND challenge_id = ?')
      .get(hintId, chId) as { id: number; challenge_id: number; content: string; cost: number } | undefined;

    if (!hint) {
      res.status(404).json({ error: 'Hint not found.' });
      return;
    }

    const existing = db
      .prepare('SELECT id FROM hint_unlocks WHERE team_id = ? AND hint_id = ?')
      .get(req.user!.team_id, hintId);

    if (!existing) {
      db.prepare('INSERT INTO hint_unlocks (team_id, hint_id, unlocked_by_user_id, cost_paid) VALUES (?, ?, ?, ?)').run(
        req.user!.team_id,
        hintId,
        req.user!.id,
        hint.cost
      );
      broadcastEvent('scoreboard_update', { reason: 'hint_unlock', teamId: req.user!.team_id });
    }

    res.json({ hintId: hint.id, content: hint.content, cost: hint.cost });
  });

  return router;
}

export function createArtifactsRouter(): Router {
  const router = express.Router();

  router.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    const cleanRel = decodeURIComponent(req.path).replace(/^\/+/, '');
    if (!cleanRel) {
      res.status(404).json({ error: 'Artifact path required.' });
      return;
    }
    const resolved = path.resolve(ARTIFACTS_DIR, cleanRel);
    const base = path.resolve(ARTIFACTS_DIR);

    if (!resolved.startsWith(base + path.sep) || !fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
      res.status(404).json({ error: 'Artifact file not found.' });
      return;
    }

    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(resolved)}"`);
    res.sendFile(cleanRel, { root: base, dotfiles: 'allow' });
  });

  return router;
}
