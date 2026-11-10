import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User';
import { Settings } from '../models/Settings';
import { requireAuth, requireRole } from '../middleware/auth';
import { HttpError } from '../errors';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', async (_req, res) => {
  const owners = await User.find({ role: 'moteur' }).select('-passwordHash').sort({ createdAt: -1 });
  res.json(owners);
});

const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  username: z.string().trim().toLowerCase().min(3).max(40).regex(/^[a-z0-9_.-]+$/, 'Use letters, numbers, . _ - only'),
  password: z.string().min(6).max(100),
});

router.post('/', async (req, res) => {
  const d = createSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(d.password, 10);
  const u = await User.create({ role: 'moteur', name: d.name, username: d.username, passwordHash, active: true });
  await Settings.create({ ownerId: u._id, ownerName: d.name });
  res.status(201).json({ _id: u.id, name: u.name, username: u.username, role: u.role, active: u.active, createdAt: u.createdAt });
});

const patchSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  password: z.string().min(6).max(100).optional(),
  active: z.boolean().optional(),
});

router.patch('/:id', async (req, res) => {
  const d = patchSchema.parse(req.body);
  const u = await User.findOne({ _id: req.params.id, role: 'moteur' });
  if (!u) throw new HttpError(404, 'Owner not found');
  if (d.name !== undefined) u.name = d.name;
  if (d.active !== undefined) u.active = d.active;
  if (d.password) u.passwordHash = await bcrypt.hash(d.password, 10);
  await u.save();
  res.json({ _id: u.id, name: u.name, username: u.username, role: u.role, active: u.active, createdAt: u.createdAt });
});

export default router;
