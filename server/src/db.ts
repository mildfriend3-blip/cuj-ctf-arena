import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { DATA_DIR } from './config.js';

fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, 'cuj_ctf.sqlite'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    tag TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL DEFAULT 'CS&IT',
    motto TEXT NOT NULL DEFAULT '',
    invite_code TEXT NOT NULL UNIQUE,
    captain_id INTEGER,
    banned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'player',
    department TEXT NOT NULL DEFAULT 'CSE',
    roll_number TEXT NOT NULL DEFAULT '',
    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    avatar_seed TEXT NOT NULL DEFAULT 'cuj',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    description TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT 'CUJ CyberSec Cell',
    flag_value TEXT NOT NULL,
    flag_case_sensitive INTEGER NOT NULL DEFAULT 1,
    initial_points INTEGER NOT NULL DEFAULT 500,
    min_points INTEGER NOT NULL DEFAULT 100,
    decay INTEGER NOT NULL DEFAULT 15,
    is_dynamic INTEGER NOT NULL DEFAULT 1,
    first_blood_bonus INTEGER NOT NULL DEFAULT 25,
    lab_type TEXT NOT NULL DEFAULT 'none',
    lab_url TEXT NOT NULL DEFAULT '',
    artifacts_json TEXT NOT NULL DEFAULT '[]',
    tags_json TEXT NOT NULL DEFAULT '[]',
    writeup TEXT NOT NULL DEFAULT '',
    published INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS hints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    order_idx INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL,
    cost INTEGER NOT NULL DEFAULT 25
  );

  CREATE TABLE IF NOT EXISTS hint_unlocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    hint_id INTEGER NOT NULL REFERENCES hints(id) ON DELETE CASCADE,
    unlocked_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cost_paid INTEGER NOT NULL DEFAULT 0,
    unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(team_id, hint_id)
  );

  CREATE TABLE IF NOT EXISTS solves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_first_blood INTEGER NOT NULL DEFAULT 0,
    bonus_points INTEGER NOT NULL DEFAULT 0,
    solved_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(challenge_id, team_id)
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submitted_flag TEXT NOT NULL,
    is_correct INTEGER NOT NULL DEFAULT 0,
    ip_address TEXT NOT NULL DEFAULT '',
    submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    created_by TEXT NOT NULL DEFAULT 'Organizer',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export function getSetting(key: string, fallback = ''): string {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? row.value : fallback;
}

export function setSetting(key: string, value: string): void {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(
    key,
    String(value)
  );
}

export function getAllSettings(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
  const out: Record<string, string> = {};
  for (const r of rows) {
    out[r.key] = r.value;
  }
  return out;
}
