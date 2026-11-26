import express, { type Router } from 'express';
import { optionalAuth } from '../auth.js';
import { IS_VERCEL } from '../config.js';
import { db, getAllSettings, isPersistentRemoteDb } from '../db.js';
import { getScoreboardData } from '../scoring.js';

export function createScoreboardRouter(): Router {
  const router = express.Router();

  router.get('/overview', optionalAuth, async (req, res) => {
    const settings = await getAllSettings();
    const isAdmin = req.user?.role === 'admin';
    const sb = await getScoreboardData(isAdmin);

    const totalChallenges = Number(
      (await db.get<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM challenges ${isAdmin ? '' : 'WHERE published = 1'}`))?.cnt || 0
    );
    const totalTeams = Number(
      (await db.get<{ cnt: number }>('SELECT COUNT(*) as cnt FROM teams WHERE banned = 0'))?.cnt || 0
    );
    const totalPlayers = Number(
      (await db.get<{ cnt: number }>("SELECT COUNT(*) as cnt FROM users WHERE role = 'player'"))?.cnt || 0
    );
    const totalSolves = Number(
      (
        await db.get<{ cnt: number }>(
          'SELECT COUNT(*) as cnt FROM solves s JOIN teams t ON t.id = s.team_id WHERE t.banned = 0'
        )
      )?.cnt || 0
    );

    const categories = await db.all<{ category: string; count: number }>(
      `SELECT category, COUNT(*) as count
       FROM challenges ${isAdmin ? '' : 'WHERE published = 1'}
       GROUP BY category
       ORDER BY count DESC`
    );

    let recentSolves = await db.all<Record<string, unknown>>(
      `SELECT s.id, c.id as challenge_id, c.title as challenge_title, c.category,
              t.id as team_id, t.name as team_name, t.tag as team_tag,
              u.username, s.is_first_blood, s.bonus_points, s.solved_at
       FROM solves s
       JOIN challenges c ON c.id = s.challenge_id
       JOIN teams t ON t.id = s.team_id
       JOIN users u ON u.id = s.user_id
       WHERE t.banned = 0
       ORDER BY s.solved_at DESC, s.id DESC
       LIMIT 30`
    );

    if (sb.frozen && sb.freezeAt) {
      recentSolves = recentSolves.filter((s) => String(s.solved_at) <= sb.freezeAt);
    }
    recentSolves = recentSolves.slice(0, 20);

    const announcements = await db.all(
      'SELECT id, title, body, severity, created_by, created_at FROM announcements ORDER BY id DESC LIMIT 12'
    );

    res.json({
      settings,
      realtimeMode: IS_VERCEL ? 'polling' : 'sse',
      dbMode: isPersistentRemoteDb ? 'turso' : IS_VERCEL ? 'ephemeral-tmp' : 'sqlite-local',
      stats: {
        totalChallenges,
        totalTeams,
        totalPlayers,
        totalSolves,
        leader: sb.standings[0] || null,
      },
      categories,
      recentSolves,
      announcements,
    });
  });

  router.get('/scoreboard', optionalAuth, async (req, res) => {
    const isAdmin = req.user?.role === 'admin';
    const data = await getScoreboardData(isAdmin);
    res.json(data);
  });

  router.get('/scoreboard/ctftime', async (_req, res) => {
    const sb = await getScoreboardData(false);
    res.json({
      standings: sb.standings.map((t) => ({
        pos: t.rank,
        team: t.name,
        score: t.score,
      })),
    });
  });

  return router;
}
