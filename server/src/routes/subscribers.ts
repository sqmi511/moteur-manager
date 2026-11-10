import { Router } from 'express';
import { z } from 'zod';
import { Subscriber } from '../models/Subscriber';
import { Bill } from '../models/Bill';
import { requireAuth, requireRole, ownerOf } from '../middleware/auth';
import { HttpError } from '../errors';

const router = Router();
router.use(requireAuth, requireRole('moteur'));

const schema = z
  .object({
    name: z.string().trim().min(1).max(100),
    phone: z.string().trim().max(30).optional().default(''),
    billingType: z.enum(['perKwh', 'perAmp']),
    amps: z.coerce.number().min(0).max(1000).optional().default(0),
    active: z.boolean().optional().default(true),
  })
  .refine((d) => d.billingType !== 'perAmp' || d.amps > 0, { message: 'Amps must be greater than 0', path: ['amps'] });

router.get('/', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const filter: Record<string, unknown> = { ownerId: ownerOf(req) };
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { phone: rx }];
  }
  res.json(await Subscriber.find(filter).sort({ name: 1 }));
});

router.post('/', async (req, res) => {
  const d = schema.parse(req.body);
  res.status(201).json(await Subscriber.create({ ...d, ownerId: ownerOf(req) }));
});

router.get('/:id', async (req, res) => {
  const s = await Subscriber.findOne({ _id: req.params.id, ownerId: ownerOf(req) });
  if (!s) throw new HttpError(404, 'Subscriber not found');
  res.json(s);
});

router.put('/:id', async (req, res) => {
  const d = schema.parse(req.body);
  const s = await Subscriber.findOneAndUpdate({ _id: req.params.id, ownerId: ownerOf(req) }, { $set: d }, { new: true });
  if (!s) throw new HttpError(404, 'Subscriber not found');
  await Bill.updateMany({ ownerId: ownerOf(req), subscriberId: s._id }, { $set: { subscriberName: s.name } });
  res.json(s);
});

router.delete('/:id', async (req, res) => {
  const s = await Subscriber.findOneAndDelete({ _id: req.params.id, ownerId: ownerOf(req) });
  if (!s) throw new HttpError(404, 'Subscriber not found');
  await Bill.deleteMany({ ownerId: ownerOf(req), subscriberId: s._id });
  res.json({ ok: true });
});

export default router;
