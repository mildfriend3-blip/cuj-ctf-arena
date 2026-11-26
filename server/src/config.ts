import path from 'node:path';

export const ROOT_DIR = path.resolve(__dirname, '..', '..');
export const SERVER_DIR = path.resolve(__dirname, '..');
export const DATA_DIR = path.join(SERVER_DIR, 'data');
export const ARTIFACTS_DIR = path.join(SERVER_DIR, 'artifacts');
export const CLIENT_DIST_DIR = path.join(ROOT_DIR, 'client', 'dist');

export const PORT = Number(process.env.PORT || 3000);
export const JWT_SECRET = process.env.JWT_SECRET || 'cuj_ctf_arena_platform_secret_2026_rahya_suchani';
export const LAB_JWT_SECRET = 'cuj2026'; // Intentionally weak secret for Web Challenge #3 (Dean's Vault)
