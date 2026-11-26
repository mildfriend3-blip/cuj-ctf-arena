import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const IS_VERCEL = process.env.VERCEL === '1';

const rootCandidates = [
  process.cwd(),
  path.resolve(__dirname, '..', '..'),
];

export const ROOT_DIR =
  rootCandidates.find((dir) => fs.existsSync(path.join(dir, 'server', 'artifacts'))) || rootCandidates[0];

export const SERVER_DIR = path.join(ROOT_DIR, 'server');
export const DATA_DIR = IS_VERCEL ? os.tmpdir() : path.join(SERVER_DIR, 'data');
export const ARTIFACTS_DIR = path.join(SERVER_DIR, 'artifacts');
export const CLIENT_DIST_DIR = path.join(ROOT_DIR, 'client', 'dist');

export const PORT = Number(process.env.PORT || 3000);
export const JWT_SECRET = process.env.JWT_SECRET || 'cuj_ctf_arena_platform_secret_2026_rahya_suchani';
export const LAB_JWT_SECRET = 'cuj2026'; // Intentionally weak secret for Web Challenge #3 (Dean's Vault)
export const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || '';
export const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || '';
