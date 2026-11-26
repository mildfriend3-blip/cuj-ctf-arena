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

  router.get('/', optionalAuth, async (req, res) => {
    const isAdmin = req.user?.role === 'admin';
    const sb = await getScoreboardData(isAdmin);
    res.json({ teams: sb.standings });
  });

  router.get('/:id', optionalAuth, async (req, res) => {
    const teamId = Number(req.params.id);
    const team = await db.get<Record<string, unknown>>(
      'SELECT id, name, tag, department, motto, invite_code, captain_id, banned, created_at FROM teams WHERE id = ?',
      teamId
    );

    if (!team) {
      res.status(404).json({ error: 'Team not found.' });
      return;
    }

    const isMemberOrAdmin = req.user?.role === 'admin' || req.user?.team_id === teamId;
    const members = await db.all(
      `SELECT u.id, u.username, u.department, u.roll_number, u.avatar_seed,
              (SELECT COUNT(*) FROM solves s WHERE s.user_id = u.id) as solve_count
       FROM users u WHERE u.team_id = ? ORDER BY u.id ASC`,
      teamId
    );

    const sb = await getScoreboardData(req.user?.role === 'admin');
    const standing = sb.standings.find((t) => t.id === teamId);

    const solves = await db.all(
      `SELECT s.challenge_id, c.title, c.category, c.difficulty, s.is_first_blood, s.bonus_points, s.solved_at, u.username as solved_by
       FROM solves s
       JOIN challenges c ON c.id = s.challenge_id
       JOIN users u ON u.id = s.user_id
       WHERE s.team_id = ?
       ORDER BY s.solved_at DESC`,
      teamId
    );

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

  router.post('/', requireAuth, async (req, res) => {
    if (req.user!.role === 'admin') {
      res.status(403).json({ error: 'Organizer admin accounts cannot join competing student teams.' });
      return;
    }
    if (req.user!.team_id) {
      res.status(400).json({ error: 'You are already in a team. Leave your current team first.' });
      return;
    }

    const name = String(req.body?.name || '').trim();
    const tag = String(req.body?.tag || name.slice(0, 4))
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
    const department = String(req.body?.department || req.user!.department || 'CSE').trim().slice(0, 48);
    const motto = String(req.body?.motto || 'Central University of Jammu').trim().slice(0, 120);

    if (name.length < 3 || name.length > 32) {
      res.status(400).json({ error: 'Team name must be 3-32 characters.' });
      return;
    }
    const existing = await db.get('SELECT id FROM teams WHERE LOWER(name) = LOWER(?)', name);
    if (existing) {
      res.status(409).json({ error: 'A team with that name already exists.' });
      return;
    }

    const inviteCode = makeInviteCode(tag);
    try {
      const teamId = await db.transaction(async (tx) => {
        const insertRes = await tx.run(
          'INSERT INTO teams (name, tag, department, motto, invite_code, captain_id) VALUES (?, ?, ?, ?, ?, ?)',
          name,
          tag || 'CUJ',
          department,
          motto,
          inviteCode,
          req.user!.id
        );
        const tid = insertRes.lastInsertRowid;
        await tx.run('UPDATE users SET team_id = ? WHERE id = ?', tid, req.user!.id);
        return tid;
      });

      broadcastEvent('team_update', { teamId, action: 'created', name });
      broadcastEvent('scoreboard_update', { reason: 'team_created' });

      const team = await db.get('SELECT * FROM teams WHERE id = ?', teamId);
      res.status(201).json({ team });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create team.' });
    }
  });

  router.post('/join', requireAuth, async (req, res) => {
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

    const team = await db.get<{ id: number; name: string; banned: number }>(
      'SELECT * FROM teams WHERE UPPER(invite_code) = ?',
      inviteCode
    );

    if (!team) {
      res.status(404).json({ error: 'Invalid invite code. Verify with your team captain.' });
      return;
    }
    if (Number(team.banned) === 1) {
      res.status(403).json({ error: 'This team is currently suspended.' });
      return;
    }

    const maxTeamSize = Math.max(1, Number(await getSetting('max_team_size', '4')));
    const countRow = await db.get<{ cnt: number }>('SELECT COUNT(*) as cnt FROM users WHERE team_id = ?', team.id);
    if (Number(countRow?.cnt || 0) >= maxTeamSize) {
      res.status(409).json({ error: `Team "${team.name}" is already at maximum capacity (${maxTeamSize} members).` });
      return;
    }

    await db.run('UPDATE users SET team_id = ? WHERE id = ?', team.id, req.user!.id);
    broadcastEvent('team_update', { teamId: team.id, action: 'member_joined', username: req.user!.username });
    res.json({ joined: true, team });
  });

  router.post('/leave', requireAuth, async (req, res) => {
    const teamId = req.user!.team_id;
    if (!teamId) {
      res.status(400).json({ error: 'You are not part of any team.' });
      return;
    }

    try {
      await db.transaction(async (tx) => {
        await tx.run('UPDATE users SET team_id = NULL WHERE id = ?', req.user!.id);
        const remaining = await tx.all<{ id: number }>('SELECT id FROM users WHERE team_id = ? ORDER BY id ASC', teamId);
        const team = await tx.get<{ captain_id: number | null }>('SELECT captain_id FROM teams WHERE id = ?', teamId);

        if (remaining.length === 0) {
          const solvesExist = await tx.get('SELECT id FROM solves WHERE team_id = ? LIMIT 1', teamId);
          if (!solvesExist) {
            await tx.run('DELETE FROM teams WHERE id = ?', teamId);
          } else {
            await tx.run('UPDATE teams SET captain_id = NULL WHERE id = ?', teamId);
          }
        } else if (Number(team?.captain_id) === req.user!.id) {
          await tx.run('UPDATE teams SET captain_id = ? WHERE id = ?', remaining[0].id, teamId);
        }
      });
      broadcastEvent('team_update', { teamId, action: 'member_left', username: req.user!.username });
      res.json({ left: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to leave team.' });
    }
  });

  router.post('/regenerate-code', requireAuth, async (req, res) => {
    const teamId = req.user!.team_id;
    if (!teamId) {
      res.status(400).json({ error: 'Not in a team.' });
      return;
    }
    const team = await db.get<{ id: number; tag: string; captain_id: number }>(
      'SELECT id, tag, captain_id FROM teams WHERE id = ?',
      teamId
    );
    if (!team || Number(team.captain_id) !== req.user!.id) {
      res.status(403).json({ error: 'Only the team captain can regenerate the invite code.' });
      return;
    }
    const newCode = makeInviteCode(team.tag);
    await db.run('UPDATE teams SET invite_code = ? WHERE id = ?', newCode, teamId);
    res.json({ invite_code: newCode });
  });

  router.post('/kick', requireAuth, async (req, res) => {
    const teamId = req.user!.team_id;
    const targetUserId = Number(req.body?.userId);
    if (!teamId) {
      res.status(400).json({ error: 'Not in a team.' });
      return;
    }
    const team = await db.get<{ captain_id: number }>('SELECT captain_id FROM teams WHERE id = ?', teamId);
    if (!team || Number(team.captain_id) !== req.user!.id) {
      res.status(403).json({ error: 'Only the team captain can remove members.' });
      return;
    }
    if (targetUserId === req.user!.id) {
      res.status(400).json({ error: 'Use Leave Team to step down yourself.' });
      return;
    }
    await db.run('UPDATE users SET team_id = NULL WHERE id = ? AND team_id = ?', targetUserId, teamId);
    broadcastEvent('team_update', { teamId, action: 'member_kicked', targetUserId });
    res.json({ removed: true });
  });

  return router;
}
