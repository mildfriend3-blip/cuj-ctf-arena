import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { createClient, type InValue } from '@libsql/client/web';
import { DATA_DIR, TURSO_AUTH_TOKEN, TURSO_DATABASE_URL } from './config.js';

export interface DbExecutor {
  get<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<T | undefined>;
  all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<T[]>;
  run(sql: string, ...params: unknown[]): Promise<{ lastInsertRowid: number; changes: number }>;
}

export interface DbClient extends DbExecutor {
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T>;
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    tag TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL DEFAULT 'CS&IT',
    motto TEXT NOT NULL DEFAULT '',
    invite_code TEXT NOT NULL UNIQUE,
    captain_id INTEGER,
    banned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS users (
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
  )`,
  `CREATE TABLE IF NOT EXISTS challenges (
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
  )`,
  `CREATE TABLE IF NOT EXISTS hints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    order_idx INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL,
    cost INTEGER NOT NULL DEFAULT 25
  )`,
  `CREATE TABLE IF NOT EXISTS hint_unlocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    hint_id INTEGER NOT NULL REFERENCES hints(id) ON DELETE CASCADE,
    unlocked_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cost_paid INTEGER NOT NULL DEFAULT 0,
    unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(team_id, hint_id)
  )`,
  `CREATE TABLE IF NOT EXISTS solves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_first_blood INTEGER NOT NULL DEFAULT 0,
    bonus_points INTEGER NOT NULL DEFAULT 0,
    solved_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(challenge_id, team_id)
  )`,
  `CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submitted_flag TEXT NOT NULL,
    is_correct INTEGER NOT NULL DEFAULT 0,
    ip_address TEXT NOT NULL DEFAULT '',
    submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    created_by TEXT NOT NULL DEFAULT 'Organizer',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

function toSqlParams(params: unknown[]): SQLInputValue[] {
  return params.map((p) => (p === undefined ? null : (p as SQLInputValue)));
}

function toLibsqlArgs(params: unknown[]): InValue[] {
  return params.map((p) => (p === undefined ? null : (p as InValue)));
}

function createLocalSqliteClient(): DbClient {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const sqlite = new DatabaseSync(path.join(DATA_DIR, 'cuj_ctf.sqlite'));
  sqlite.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const execAdapter: DbExecutor = {
    async get<T>(sql: string, ...params: unknown[]) {
      return sqlite.prepare(sql).get(...toSqlParams(params)) as T | undefined;
    },
    async all<T>(sql: string, ...params: unknown[]) {
      return sqlite.prepare(sql).all(...toSqlParams(params)) as unknown as T[];
    },
    async run(sql: string, ...params: unknown[]) {
      const res = sqlite.prepare(sql).run(...toSqlParams(params));
      return {
        lastInsertRowid: Number(res.lastInsertRowid || 0),
        changes: Number(res.changes || 0),
      };
    },
  };

  return {
    ...execAdapter,
    async exec(sql: string) {
      sqlite.exec(sql);
    },
    async transaction<T>(fn: (tx: DbExecutor) => Promise<T>) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const result = await fn(execAdapter);
        sqlite.exec('COMMIT');
        return result;
      } catch (err) {
        sqlite.exec('ROLLBACK');
        throw err;
      }
    },
  };
}

function createTursoClient(): DbClient {
  const client = createClient({
    url: TURSO_DATABASE_URL,
    authToken: TURSO_AUTH_TOKEN || undefined,
  });

  const makeExec = (runner: { execute: typeof client.execute }): DbExecutor => ({
    async get<T>(sql: string, ...params: unknown[]) {
      const rs = await runner.execute({ sql, args: toLibsqlArgs(params) });
      return (rs.rows[0] as unknown as T) || undefined;
    },
    async all<T>(sql: string, ...params: unknown[]) {
      const rs = await runner.execute({ sql, args: toLibsqlArgs(params) });
      return rs.rows as unknown as T[];
    },
    async run(sql: string, ...params: unknown[]) {
      const rs = await runner.execute({ sql, args: toLibsqlArgs(params) });
      return {
        lastInsertRowid: Number(rs.lastInsertRowid || 0),
        changes: Number(rs.rowsAffected || 0),
      };
    },
  });

  return {
    ...makeExec(client),
    async exec(sql: string) {
      await client.executeMultiple(sql);
    },
    async transaction<T>(fn: (tx: DbExecutor) => Promise<T>) {
      const tx = await client.transaction('write');
      try {
        const result = await fn(makeExec(tx));
        await tx.commit();
        return result;
      } catch (err) {
        await tx.rollback();
        throw err;
      } finally {
        tx.close();
      }
    },
  };
}

export const db: DbClient = TURSO_DATABASE_URL ? createTursoClient() : createLocalSqliteClient();
export const isPersistentRemoteDb = Boolean(TURSO_DATABASE_URL);

let schemaPromise: Promise<void> | null = null;
export function initSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      for (const stmt of SCHEMA_STATEMENTS) {
        await db.exec(stmt);
      }
    })();
  }
  return schemaPromise;
}

export async function getSetting(key: string, fallback = ''): Promise<string> {
  const row = await db.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row ? String(row.value) : fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.run(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    String(value)
  );
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.all<{ key: string; value: string }>('SELECT key, value FROM settings');
  const out: Record<string, string> = {};
  for (const r of rows) {
    out[String(r.key)] = String(r.value);
  }
  return out;
}
