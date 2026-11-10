import { Router, Request } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { Settings } from '../models/Settings';
import { requireAuth, requireRole, ownerOf } from '../middleware/auth';
import { config } from '../config';
import { HttpError } from '../errors';

const router = Router();
router.use(requireAuth, requireRole('moteur'));

const schema = z.object({
  billingModes: z
    .object({ perKwh: z.boolean(), perAmp: z.boolean() })
    .refine((m) => m.perKwh || m.perAmp, 'Enable at least one billing mode'),
  pricePerKwh: z.coerce.number().min(0),
  pricePerAmp: z.coerce.number().min(0),
  fixedFee: z.coerce.number().min(0),
  currency: z.enum(['USD', 'LBP', 'both']),
  exchangeRate: z.coerce.number().positive(),
  ownerName: z.string().trim().max(120),
  phone: z.string().trim().max(60),
  address: z.string().trim().max(200),
  footerNote: z.string().trim().max(200),
});

async function getOrCreate(req: Request) {
  return Settings.findOneAndUpdate(
    { ownerId: ownerOf(req) },
    { $setOnInsert: { ownerId: ownerOf(req), ownerName: req.auth.name } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

const removeFile = (logoPath?: string) => {
  if (!logoPath) return;
  fs.promises.unlink(path.join(config.uploadsDir, path.basename(logoPath))).catch(() => undefined);
};

router.get('/', async (req, res) => {
  res.json(await getOrCreate(req));
});

router.put('/', async (req, res) => {
  const data = schema.parse(req.body);
  const s = await Settings.findOneAndUpdate(
    { ownerId: ownerOf(req) },
    { $set: data },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  res.json(s);
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (_r, _f, cb) => cb(null, config.uploadsDir),
    filename: (req, file, cb) => cb(null, `${req.auth.id}-${Date.now()}${file.mimetype === 'image/png' ? '.png' : '.jpg'}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_r, file, cb) => {
    if (['image/png', 'image/jpeg'].includes(file.mimetype)) cb(null, true);
    else cb(new HttpError(400, 'Only PNG or JPG images are allowed'));
  },
});

router.post('/logo', upload.single('logo'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'No file uploaded');
  const s = await getOrCreate(req);
  removeFile(s.logoPath);
  s.logoPath = `/uploads/${req.file.filename}`;
  await s.save();
  res.json(s);
});

router.delete('/logo', async (req, res) => {
  const s = await getOrCreate(req);
  removeFile(s.logoPath);
  s.logoPath = '';
  await s.save();
  res.json(s);
});

export default router;
