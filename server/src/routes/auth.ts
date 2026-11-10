import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User';
import { config } from '../config';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = z
    .object({ username: z.string().min(1), password: z.string().min(1) })
    .parse(req.body);
  const u = await User.findOne({ username: username.toLowerCase().trim() });
  if (!u || !(await bcrypt.compare(password, u.passwordHash))) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }
  if (!u.active) return res.status(403).json({ message: 'This account is disabled' });
  const token = jwt.sign({ id: u.id }, config.jwtSecret, { expiresIn: '7d' });
  res.json({ token, user: { id: u.id, role: u.role, name: u.name, username: u.username } });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.auth });
});

export default router;
