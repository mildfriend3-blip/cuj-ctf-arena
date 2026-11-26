import express, { type Router } from 'express';
import { requireAdmin } from '../auth.js';
import { db, getAllSettings, setSetting } from '../db.js';
import { broadcastEvent } from '../events.js';

export function createAdminRouter(): Router {
  const router = express.Router();
  router.use(requireAdmin);

  router.get('/overview', async (_req, res) => {
    const settings = await getAllSettings();
    const challenges = await db.all<Record<string, unknown>>('SELECT * FROM challenges ORDER BY sort_order ASC, id ASC');
    const hints = await db.all('SELECT * FROM hints ORDER BY challenge_id ASC, order_idx ASC');
    const teams = await db.all(
      `SELECT t.*,
              (SELECT COUNT(*) FROM users u WHERE u.team_id = t.id) as member_count,
              (SELECT COUNT(*) FROM solves s WHERE s.team_id = t.id) as solve_count
       FROM teams t ORDER BY t.id ASC`
    );
    const submissions = await db.all(
      `SELECT sub.id, sub.submitted_flag, sub.is_correct, sub.ip_address, sub.submitted_at,
              c.title as challenge_title, c.category, t.name as team_name, u.username
       FROM submissions sub
       JOIN challenges c ON c.id = sub.challenge_id
       LEFT JOIN teams t ON t.id = sub.team_id
       JOIN users u ON u.id = sub.user_id
       ORDER BY sub.id DESC
       LIMIT 100`
    );
    const announcements = await db.all('SELECT * FROM announcements ORDER BY id DESC LIMIT 30');

    res.json({
      settings,
      challenges: challenges.map((c) => ({
        ...c,
        artifacts: JSON.parse(String(c.artifacts_json || '[]')),
        tags: JSON.parse(String(c.tags_json || '[]')),
      })),
      hints,
      teams,
      submissions,
      announcements,
    });
  });

  router.put('/settings', async (req, res) => {
    const allowedKeys = [
      'competition_name',
      'university_name',
      'subtitle',
      'status',
      'starts_at',
      'ends_at',
      'max_team_size',
      'scoreboard_frozen',
      'writeups_unlocked',
      'registration_open',
      'dynamic_scoring',
    ];
    const body = req.body || {};
    for (const k of allowedKeys) {
      if (body[k] !== undefined) {
        await setSetting(k, String(body[k]));
      }
    }
    if (body.scoreboard_frozen === '1' || body.scoreboard_frozen === true || body.scoreboard_frozen === 1) {
      await setSetting('scoreboard_frozen', '1');
      if (!body.freeze_at) {
        await setSetting('freeze_at', new Date().toISOString());
      }
    } else if (body.scoreboard_frozen === '0' || body.scoreboard_frozen === false || body.scoreboard_frozen === 0) {
      await setSetting('scoreboard_frozen', '0');
      await setSetting('freeze_at', '');
    }

    const updated = await getAllSettings();
    broadcastEvent('settings_update', updated);
    broadcastEvent('scoreboard_update', { reason: 'settings_changed' });
    res.json({ settings: updated });
  });

  router.post('/challenges', async (req, res) => {
    const b = req.body || {};
    const title = String(b.title || '').trim();
    const slug =
      String(b.slug || title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `chal-${Date.now()}`;
    const category = String(b.category || 'Misc').trim();
    const difficulty = String(b.difficulty || 'Medium').trim();
    const description = String(b.description || '').trim();
    const author = String(b.author || req.user!.username).trim();
    const flagValue = String(b.flag_value || '').trim();
    const initialPoints = Math.max(50, Number(b.initial_points || 300));
    const minPoints = Math.max(25, Number(b.min_points || 100));
    const decay = Math.max(1, Number(b.decay || 15));
    const firstBloodBonus = Math.max(0, Number(b.first_blood_bonus ?? 25));
    const labType = String(b.lab_type || 'none');
    const labUrl = String(b.lab_url || '');
    const writeup = String(b.writeup || '');
    const tags = Array.isArray(b.tags)
      ? b.tags
      : String(b.tags || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
    const published = b.published === false || b.published === 0 ? 0 : 1;

    if (!title || !flagValue || !description) {
      res.status(400).json({ error: 'Title, description, and flag value are required.' });
      return;
    }

    try {
      const insertRes = await db.run(
        `INSERT INTO challenges (
           slug, title, category, difficulty, description, author, flag_value,
           initial_points, min_points, decay, is_dynamic, first_blood_bonus,
           lab_type, lab_url, artifacts_json, tags_json, writeup, published
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, '[]', ?, ?, ?)`,
        slug,
        title,
        category,
        difficulty,
        description,
        author,
        flagValue,
        initialPoints,
        minPoints,
        decay,
        firstBloodBonus,
        labType,
        labUrl,
        JSON.stringify(tags),
        writeup,
        published
      );
      const chId = insertRes.lastInsertRowid;
      if (Array.isArray(b.hints)) {
        for (let idx = 0; idx < b.hints.length; idx++) {
          const h = b.hints[idx] as { content?: string; cost?: number };
          if (h?.content) {
            await db.run(
              'INSERT INTO hints (challenge_id, order_idx, content, cost) VALUES (?, ?, ?, ?)',
              chId,
              idx + 1,
              String(h.content),
              Number(h.cost || 25)
            );
          }
        }
      }
      broadcastEvent('scoreboard_update', { reason: 'challenge_created' });
      res.status(201).json({ id: chId });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create challenge.' });
    }
  });

  router.put('/challenges/:id', async (req, res) => {
    const chId = Number(req.params.id);
    const existing = await db.get<Record<string, unknown>>('SELECT * FROM challenges WHERE id = ?', chId);
    if (!existing) {
      res.status(404).json({ error: 'Challenge not found.' });
      return;
    }
    const b = req.body || {};
    const tags =
      b.tags !== undefined
        ? JSON.stringify(
            Array.isArray(b.tags)
              ? b.tags
              : String(b.tags)
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
          )
        : existing.tags_json;

    await db.run(
      `UPDATE challenges SET
        title = ?, category = ?, difficulty = ?, description = ?, author = ?,
        flag_value = ?, initial_points = ?, min_points = ?, decay = ?,
        first_blood_bonus = ?, lab_type = ?, lab_url = ?, tags_json = ?,
        writeup = ?, published = ?
       WHERE id = ?`,
      String(b.title ?? existing.title),
      String(b.category ?? existing.category),
      String(b.difficulty ?? existing.difficulty),
      String(b.description ?? existing.description),
      String(b.author ?? existing.author),
      String(b.flag_value ?? existing.flag_value),
      Number(b.initial_points ?? existing.initial_points),
      Number(b.min_points ?? existing.min_points),
      Number(b.decay ?? existing.decay),
      Number(b.first_blood_bonus ?? existing.first_blood_bonus),
      String(b.lab_type ?? existing.lab_type),
      String(b.lab_url ?? existing.lab_url),
      String(tags),
      String(b.writeup ?? existing.writeup),
      b.published === undefined ? Number(existing.published) : b.published ? 1 : 0,
      chId
    );
    broadcastEvent('scoreboard_update', { reason: 'challenge_updated' });
    res.json({ updated: true });
  });

  router.delete('/challenges/:id', async (req, res) => {
    const chId = Number(req.params.id);
    await db.run('DELETE FROM challenges WHERE id = ?', chId);
    broadcastEvent('scoreboard_update', { reason: 'challenge_deleted' });
    res.json({ deleted: true });
  });

  router.post('/teams/:id/ban', async (req, res) => {
    const teamId = Number(req.params.id);
    const banned = req.body?.banned ? 1 : 0;
    await db.run('UPDATE teams SET banned = ? WHERE id = ?', banned, teamId);
    broadcastEvent('scoreboard_update', { reason: 'team_moderation', teamId, banned });
    res.json({ teamId, banned: banned === 1 });
  });

  router.post('/announcements', async (req, res) => {
    const title = String(req.body?.title || '').trim();
    const body = String(req.body?.body || '').trim();
    const severity = String(req.body?.severity || 'info');
    if (!title || !body) {
      res.status(400).json({ error: 'Announcement title and body are required.' });
      return;
    }
    const r = await db.run(
      'INSERT INTO announcements (title, body, severity, created_by) VALUES (?, ?, ?, ?)',
      title,
      body,
      severity,
      req.user!.username
    );
    const item = await db.get('SELECT * FROM announcements WHERE id = ?', r.lastInsertRowid);
    broadcastEvent('announcement', item);
    res.status(201).json({ announcement: item });
  });

  router.delete('/announcements/:id', async (req, res) => {
    await db.run('DELETE FROM announcements WHERE id = ?', Number(req.params.id));
    res.json({ deleted: true });
  });

  return router;
}
