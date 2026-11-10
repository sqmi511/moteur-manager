import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { config } from '../config';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth: { id: string; role: 'admin' | 'moteur'; name: string; username: string };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ message: 'Not authenticated' });
  try {
    const payload = jwt.verify(h.slice(7), config.jwtSecret) as { id: string };
    const u = await User.findById(payload.id);
    if (!u || !u.active) return res.status(401).json({ message: 'Account unavailable' });
    req.auth = { id: u.id, role: u.role, name: u.name, username: u.username };
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired session' });
  }
}

export const requireRole = (role: 'admin' | 'moteur') => (req: Request, res: Response, next: NextFunction) => {
  if (req.auth?.role !== role) return res.status(403).json({ message: 'Forbidden' });
  next();
};

/** The ownerId used to filter EVERY query of an owner's data. */
export const ownerOf = (req: Request) => new Types.ObjectId(req.auth.id);
