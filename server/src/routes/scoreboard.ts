import express, { type Router } from 'express';
import { optionalAuth } from '../auth.js';
import { db, getAllSettings } from '../db.js';
import { getScoreboardData } from '../scoring.js';

export function createScoreboardRouter(): Router {
  const router = express.Router();

  router.get('/overview', optionalAuth, (req, res) => {
    const settings = getAllSettings();
    const isAdmin = req.user?.role === 'admin';
    const sb = getScoreboardData(isAdmin);

    const totalChallenges = (
      db.prepare(`SELECT COUNT(*) as cnt FROM challenges ${isAdmin ? '' : 'WHERE published = 1'}`).get() as { cnt: number }
    ).cnt;
    const totalTeams = (db.prepare('SELECT COUNT(*) as cnt FROM teams WHERE banned = 0').get() as { cnt: number }).cnt;
    const totalPlayers = (
      db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'player'").get() as { cnt: number }
    ).cnt;
    const totalSolves = (
      db.prepare('SELECT COUNT(*) as cnt FROM solves s JOIN teams t ON t.id = s.team_id WHERE t.banned = 0').get() as { cnt: number }
    ).cnt;

    const categories = db
      .prepare(
        `SELECT category, COUNT(*) as count
         FROM challenges ${isAdmin ? '' : 'WHERE published = 1'}
         GROUP BY category
         ORDER BY count DESC`
      )
      .all() as Array<{ category: string; count: number }>;

    const freezeFilter = sb.frozen && sb.freezeAt ? `AND s.solved_at <= '${sb.freezeAt.replace(/'/g, '')}'` : '';
    const recentSolves = db
      .prepare(
        `SELECT s.id, c.id as challenge_id, c.title as challenge_title, c.category,
                t.id as team_id, t.name as team_name, t.tag as team_tag,
                u.username, s.is_first_blood, s.bonus_points, s.solved_at
         FROM solves s
         JOIN challenges c ON c.id = s.challenge_id
         JOIN teams t ON t.id = s.team_id
         JOIN users u ON u.id = s.user_id
         WHERE t.banned = 0 ${freezeFilter}
         ORDER BY s.solved_at DESC, s.id DESC
         LIMIT 20`
      )
      .all();

    const announcements = db
      .prepare('SELECT id, title, body, severity, created_by, created_at FROM announcements ORDER BY id DESC LIMIT 12')
      .all();

    res.json({
      settings,
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

  router.get('/scoreboard', optionalAuth, (req, res) => {
    const isAdmin = req.user?.role === 'admin';
    const data = getScoreboardData(isAdmin);
    res.json(data);
  });

  router.get('/scoreboard/ctftime', (_req, res) => {
    const sb = getScoreboardData(false);
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
