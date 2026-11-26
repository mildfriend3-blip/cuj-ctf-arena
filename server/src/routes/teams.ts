import crypto from 'node:crypto';
import express, { type Router } from 'express';
import { optionalAuth, requireAuth } from '../auth.js';
import { db, getSetting } from '../db.js';
import { broadcastEvent } from '../events.js';
import { getScoreboardData } from '../scoring.js';

function makeInviteCode(tag: string): string {
  const clean = (tag || 'CUJ').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 4) || 'CUJ';
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `CUJ-${clean}-${rand}`;
}

export function createTeamsRouter(): Router {
  const router = express.Router();

  router.get('/', optionalAuth, (req, res) => {
    const isAdmin = req.user?.role === 'admin';
    const sb = getScoreboardData(isAdmin);
    res.json({ teams: sb.standings });
  });

  router.get('/:id', optionalAuth, (req, res) => {
    const teamId = Number(req.params.id);
    const team = db
      .prepare('SELECT id, name, tag, department, motto, invite_code, captain_id, banned, created_at FROM teams WHERE id = ?')
      .get(teamId) as Record<string, unknown> | undefined;

    if (!team) {
      res.status(404).json({ error: 'Team not found.' });
      return;
    }

    const isMemberOrAdmin = req.user?.role === 'admin' || req.user?.team_id === teamId;
    const members = db
      .prepare(
        `SELECT u.id, u.username, u.department, u.roll_number, u.avatar_seed,
                (SELECT COUNT(*) FROM solves s WHERE s.user_id = u.id) as solve_count
         FROM users u WHERE u.team_id = ? ORDER BY u.id ASC`
      )
      .all(teamId);

    const sb = getScoreboardData(req.user?.role === 'admin');
    const standing = sb.standings.find((t) => t.id === teamId);

    const solves = db
      .prepare(
        `SELECT s.challenge_id, c.title, c.category, c.difficulty, s.is_first_blood, s.bonus_points, s.solved_at, u.username as solved_by
         FROM solves s
         JOIN challenges c ON c.id = s.challenge_id
         JOIN users u ON u.id = s.user_id
         WHERE s.team_id = ?
         ORDER BY s.solved_at DESC`
      )
      .all(teamId);

    res.json({
      team: {
        ...team,
        invite_code: isMemberOrAdmin ? team.invite_code : undefined,
        rank: standing?.rank || null,
        score: standing?.score || 0,
        hintPenalty: standing?.hintPenalty || 0,
        firstBloods: standing?.firstBloods || 0,
        categoryScores: standing?.categoryScores || {},
      },
      members,
      solves,
    });
  });

  router.post('/', requireAuth, (req, res) => {
    if (req.user!.role === 'admin') {
      res.status(403).json({ error: 'Organizer admin accounts cannot join competing student teams.' });
      return;
    }
    if (req.user!.team_id) {
      res.status(400).json({ error: 'You are already in a team. Leave your current team first.' });
      return;
    }

    const name = String(req.body?.name || '').trim();
    const tag = String(req.body?.tag || name.slice(0, 4)).trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const department = String(req.body?.department || req.user!.department || 'CSE').trim().slice(0, 48);
    const motto = String(req.body?.motto || 'Central University of Jammu').trim().slice(0, 120);

    if (name.length < 3 || name.length > 32) {
      res.status(400).json({ error: 'Team name must be 3-32 characters.' });
      return;
    }
    const existing = db.prepare('SELECT id FROM teams WHERE LOWER(name) = LOWER(?)').get(name);
    if (existing) {
      res.status(409).json({ error: 'A team with that name already exists.' });
      return;
    }

    const inviteCode = makeInviteCode(tag);
    db.exec('BEGIN IMMEDIATE');
    try {
      const insertRes = db
        .prepare('INSERT INTO teams (name, tag, department, motto, invite_code, captain_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(name, tag || 'CUJ', department, motto, inviteCode, req.user!.id);
      const teamId = Number(insertRes.lastInsertRowid);
      db.prepare('UPDATE users SET team_id = ? WHERE id = ?').run(teamId, req.user!.id);
      db.exec('COMMIT');

      broadcastEvent('team_update', { teamId, action: 'created', name });
      broadcastEvent('scoreboard_update', { reason: 'team_created' });

      const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
      res.status(201).json({ team });
    } catch (err) {
      db.exec('ROLLBACK');
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create team.' });
    }
  });

  router.post('/join', requireAuth, (req, res) => {
    if (req.user!.role === 'admin') {
      res.status(403).json({ error: 'Admin organizers cannot join student teams.' });
      return;
    }
    if (req.user!.team_id) {
      res.status(400).json({ error: 'Leave your current team before joining another.' });
      return;
    }

    const inviteCode = String(req.body?.inviteCode || '').trim().toUpperCase();
    if (!inviteCode) {
      res.status(400).json({ error: 'Team invite code is required.' });
      return;
    }

    const team = db.prepare('SELECT * FROM teams WHERE UPPER(invite_code) = ?').get(inviteCode) as
      | { id: number; name: string; banned: number }
      | undefined;

    if (!team) {
      res.status(404).json({ error: 'Invalid invite code. Verify with your team captain.' });
      return;
    }
    if (team.banned) {
      res.status(403).json({ error: 'This team is currently suspended.' });
      return;
    }

    const maxTeamSize = Math.max(1, Number(getSetting('max_team_size', '4')));
    const countRow = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE team_id = ?').get(team.id) as { cnt: number };
    if (countRow.cnt >= maxTeamSize) {
      res.status(409).json({ error: `Team "${team.name}" is already at maximum capacity (${maxTeamSize} members).` });
      return;
    }

    db.prepare('UPDATE users SET team_id = ? WHERE id = ?').run(team.id, req.user!.id);
    broadcastEvent('team_update', { teamId: team.id, action: 'member_joined', username: req.user!.username });
    res.json({ joined: true, team });
  });

  router.post('/leave', requireAuth, (req, res) => {
    const teamId = req.user!.team_id;
    if (!teamId) {
      res.status(400).json({ error: 'You are not part of any team.' });
      return;
    }

    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('UPDATE users SET team_id = NULL WHERE id = ?').run(req.user!.id);
      const remaining = db
        .prepare('SELECT id FROM users WHERE team_id = ? ORDER BY id ASC')
        .all(teamId) as Array<{ id: number }>;

      const team = db.prepare('SELECT captain_id FROM teams WHERE id = ?').get(teamId) as { captain_id: number | null } | undefined;
      if (remaining.length === 0) {
        const solvesExist = db.prepare('SELECT id FROM solves WHERE team_id = ? LIMIT 1').get(teamId);
        if (!solvesExist) {
          db.prepare('DELETE FROM teams WHERE id = ?').run(teamId);
        } else {
          db.prepare('UPDATE teams SET captain_id = NULL WHERE id = ?').run(teamId);
        }
      } else if (team?.captain_id === req.user!.id) {
        db.prepare('UPDATE teams SET captain_id = ? WHERE id = ?').run(remaining[0].id, teamId);
      }
      db.exec('COMMIT');
      broadcastEvent('team_update', { teamId, action: 'member_left', username: req.user!.username });
      res.json({ left: true });
    } catch (err) {
      db.exec('ROLLBACK');
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to leave team.' });
    }
  });

  router.post('/regenerate-code', requireAuth, (req, res) => {
    const teamId = req.user!.team_id;
    if (!teamId) {
      res.status(400).json({ error: 'Not in a team.' });
      return;
    }
    const team = db.prepare('SELECT id, tag, captain_id FROM teams WHERE id = ?').get(teamId) as
      | { id: number; tag: string; captain_id: number }
      | undefined;
    if (!team || team.captain_id !== req.user!.id) {
      res.status(403).json({ error: 'Only the team captain can regenerate the invite code.' });
      return;
    }
    const newCode = makeInviteCode(team.tag);
    db.prepare('UPDATE teams SET invite_code = ? WHERE id = ?').run(newCode, teamId);
    res.json({ invite_code: newCode });
  });

  router.post('/kick', requireAuth, (req, res) => {
    const teamId = req.user!.team_id;
    const targetUserId = Number(req.body?.userId);
    if (!teamId) {
      res.status(400).json({ error: 'Not in a team.' });
      return;
    }
    const team = db.prepare('SELECT captain_id FROM teams WHERE id = ?').get(teamId) as { captain_id: number } | undefined;
    if (!team || team.captain_id !== req.user!.id) {
      res.status(403).json({ error: 'Only the team captain can remove members.' });
      return;
    }
    if (targetUserId === req.user!.id) {
      res.status(400).json({ error: 'Use Leave Team to step down yourself.' });
      return;
    }
    db.prepare('UPDATE users SET team_id = NULL WHERE id = ? AND team_id = ?').run(targetUserId, teamId);
    broadcastEvent('team_update', { teamId, action: 'member_kicked', targetUserId });
    res.json({ removed: true });
  });

  return router;
}
