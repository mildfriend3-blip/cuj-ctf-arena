import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './config.js';
import { db } from './db.js';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: 'player' | 'admin';
  department: string;
  roll_number: string;
  team_id: number | null;
  avatar_seed: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser | null;
    }
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derived = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derived.length) return false;
  return crypto.timingSafeEqual(keyBuf, derived);
}

export function signAuthToken(userId: number): string {
  return jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: '7d' });
}

async function loadUserFromHeader(req: Request): Promise<AuthUser | null> {
  const header = req.headers.authorization || '';
  const queryToken = typeof req.query.token === 'string' ? req.query.token : '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : queryToken;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { uid?: number };
    if (!decoded.uid) return null;
    const row = await db.get<AuthUser>(
      'SELECT id, username, email, role, department, roll_number, team_id, avatar_seed FROM users WHERE id = ?',
      decoded.uid
    );
    return row || null;
  } catch {
    return null;
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  req.user = await loadUserFromHeader(req);
  next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await loadUserFromHeader(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  req.user = user;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await loadUserFromHeader(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Admin organizer privileges required.' });
    return;
  }
  req.user = user;
  next();
}
