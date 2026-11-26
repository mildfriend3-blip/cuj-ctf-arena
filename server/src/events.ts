import type { Request, Response } from 'express';
import { IS_VERCEL } from './config.js';

const clients = new Set<Response>();

export function sseHandler(req: Request, res: Response): void {
  if (IS_VERCEL) {
    res.status(204).end();
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, time: new Date().toISOString() })}\n\n`);
  clients.add(res);

  const keepAlive = setInterval(() => {
    try {
      res.write(`: heartbeat ${Date.now()}\n\n`);
    } catch {
      clearInterval(keepAlive);
      clients.delete(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    clients.delete(res);
  });
}

export function broadcastEvent(eventName: string, data: unknown): void {
  if (IS_VERCEL) return;
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}
