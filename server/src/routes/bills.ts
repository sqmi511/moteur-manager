import { Router } from 'express';
import { HydratedDocument, Types } from 'mongoose';
import { z } from 'zod';
import { Bill, nextInvoiceNo } from '../models/Bill';
import { Subscriber, ISubscriber } from '../models/Subscriber';
import { Settings, ISettings } from '../models/Settings';
import { requireAuth, requireRole, ownerOf } from '../middleware/auth';
import { HttpError } from '../errors';
import { calcTotal, round2, statusOf, MONTH_RE } from '../lib/billing';

const router = Router();
router.use(requireAuth, requireRole('moteur'));

const monthSchema = z.string().regex(MONTH_RE, 'Month must be YYYY-MM');
const entrySchema = z.object({
  prevReading: z.number().min(0).optional(),
  currReading: z.number().min(0).optional(),
  amps: z.number().min(0).optional(),
});
type EntryInput = z.infer<typeof entrySchema>;

async function loadSettings(ownerId: Types.ObjectId) {
  return Settings.findOneAndUpdate({ ownerId }, { $setOnInsert: { ownerId } }, { upsert: true, new: true, setDefaultsOnInsert: true });
}

/** Create or update the bill of one subscriber for one month. */
async function upsertBill(
  ownerId: Types.ObjectId,
  settings: ISettings,
  sub: HydratedDocument<ISubscriber>,
  month: string,
  input: EntryInput,
  refresh: boolean
) {
  if (!settings.billingModes[sub.billingType]) {
    throw new HttpError(400, `Billing mode "${sub.billingType}" is disabled in settings`);
  }
  let bill = await Bill.findOne({ ownerId, subscriberId: sub._id, month });
  const created = !bill;
  const keep = !!bill && !refresh && bill.billingType === sub.billingType;
  const unitPrice = keep ? bill!.unitPrice : sub.billingType === 'perKwh' ? settings.pricePerKwh : settings.pricePerAmp;
  const fixedFee = keep ? bill!.fixedFee : settings.fixedFee;
  const currency = keep ? bill!.currency : settings.currency;
  const exchangeRate = keep ? bill!.exchangeRate : settings.exchangeRate;

  let prev = 0, curr = 0, kwh = 0, amps = 0;
  if (sub.billingType === 'perKwh') {
    if (input.currReading === undefined) throw new HttpError(400, 'Current reading is required');
    prev = input.prevReading ?? bill?.prevReading ?? 0;
    curr = input.currReading;
    if (curr < prev) throw new HttpError(400, 'Current reading is lower than the previous reading');
    kwh = round2(curr - prev);
  } else {
    amps = input.amps ?? sub.amps;
    if (!(amps > 0)) throw new HttpError(400, 'Amps must be greater than 0');
  }
  const total = calcTotal(sub.billingType, unitPrice, fixedFee, kwh, amps);

  if (!bill) {
    bill = new Bill({ ownerId, subscriberId: sub._id, month, invoiceNo: await nextInvoiceNo(ownerId), paidAmount: 0 });
  }
  const paidAmount = Math.min(bill.paidAmount ?? 0, total);
  bill.set({
    subscriberName: sub.name,
    billingType: sub.billingType,
    prevReading: prev,
    currReading: curr,
    kwh,
    amps,
    unitPrice,
    fixedFee,
    currency,
    exchangeRate,
    total,
    paidAmount,
    status: statusOf(total, paidAmount),
  });
  await bill.save();
  return { bill, created };
}

// ---------- list ----------
router.get('/', async (req, res) => {
  const filter: Record<string, unknown> = { ownerId: ownerOf(req) };
  if (typeof req.query.month === 'string') filter.month = monthSchema.parse(req.query.month);
  if (typeof req.query.status === 'string') filter.status = req.query.status;
  if (typeof req.query.subscriberId === 'string') filter.subscriberId = req.query.subscriberId;
  res.json(await Bill.find(filter).sort({ invoiceNo: 1 }));
});

// ---------- grid data for the monthly entry screen ----------
router.get('/entries', async (req, res) => {
  const ownerId = ownerOf(req);
  const month = monthSchema.parse(req.query.month);
  const [subs, bills, prevs] = await Promise.all([
    Subscriber.find({ ownerId, active: true }).sort({ name: 1 }),
    Bill.find({ ownerId, month }),
    Bill.aggregate([
      { $match: { ownerId, month: { $lt: month }, billingType: 'perKwh' } },
      { $sort: { month: -1 } },
      { $group: { _id: '$subscriberId', currReading: { $first: '$currReading' } } },
    ]),
  ]);
  const billBy = new Map(bills.map((b) => [String(b.subscriberId), b]));
  const prevBy = new Map<string, number>(prevs.map((p) => [String(p._id), p.currReading as number]));
  res.json(
    subs.map((s) => {
      const bill = billBy.get(String(s._id)) ?? null;
      const prevFromHistory = prevBy.get(String(s._id));
      return {
        subscriber: s,
        bill,
        prevReading: bill ? bill.prevReading : prevFromHistory ?? 0,
        hasPrevious: prevFromHistory !== undefined,
      };
    })
  );
});

// ---------- bulk generate ----------
const bulkSchema = z.object({
  month: monthSchema,
  refreshPrices: z.boolean().optional().default(false),
  entries: z.array(entrySchema.extend({ subscriberId: z.string() })).min(1).max(2000),
});

router.post('/bulk', async (req, res) => {
  const ownerId = ownerOf(req);
  const d = bulkSchema.parse(req.body);
  const settings = await loadSettings(ownerId);
  let created = 0, updated = 0;
  const errors: { subscriberId: string; name: string; message: string }[] = [];
  for (const e of d.entries) {
    const sub = await Subscriber.findOne({ _id: e.subscriberId, ownerId });
    if (!sub) {
      errors.push({ subscriberId: e.subscriberId, name: '?', message: 'Subscriber not found' });
      continue;
    }
    try {
      const r = await upsertBill(ownerId, settings, sub, d.month, e, d.refreshPrices);
      if (r.created) created++;
      else updated++;
    } catch (err) {
      if (err instanceof HttpError) errors.push({ subscriberId: e.subscriberId, name: sub.name, message: err.message });
      else throw err;
    }
  }
  res.json({ created, updated, errors });
});

// ---------- single CRUD ----------
router.post('/', async (req, res) => {
  const ownerId = ownerOf(req);
  const d = entrySchema.extend({ subscriberId: z.string(), month: monthSchema, refreshPrices: z.boolean().optional().default(false) }).parse(req.body);
  const sub = await Subscriber.findOne({ _id: d.subscriberId, ownerId });
  if (!sub) throw new HttpError(404, 'Subscriber not found');
  const r = await upsertBill(ownerId, await loadSettings(ownerId), sub, d.month, d, d.refreshPrices);
  res.status(r.created ? 201 : 200).json(r.bill);
});

router.get('/:id', async (req, res) => {
  const b = await Bill.findOne({ _id: req.params.id, ownerId: ownerOf(req) });
  if (!b) throw new HttpError(404, 'Bill not found');
  res.json(b);
});

router.put('/:id', async (req, res) => {
  const ownerId = ownerOf(req);
  const d = entrySchema.extend({ refreshPrices: z.boolean().optional().default(false) }).parse(req.body);
  const b = await Bill.findOne({ _id: req.params.id, ownerId });
  if (!b) throw new HttpError(404, 'Bill not found');
  const sub = await Subscriber.findOne({ _id: b.subscriberId, ownerId });
  if (!sub) throw new HttpError(404, 'Subscriber not found');
  const r = await upsertBill(ownerId, await loadSettings(ownerId), sub, b.month, d, d.refreshPrices);
  res.json(r.bill);
});

router.patch('/:id/payment', async (req, res) => {
  const { paidAmount } = z.object({ paidAmount: z.coerce.number().min(0) }).parse(req.body);
  const b = await Bill.findOne({ _id: req.params.id, ownerId: ownerOf(req) });
  if (!b) throw new HttpError(404, 'Bill not found');
  b.paidAmount = Math.min(round2(paidAmount), b.total);
  b.status = statusOf(b.total, b.paidAmount);
  await b.save();
  res.json(b);
});

router.delete('/:id', async (req, res) => {
  const b = await Bill.findOneAndDelete({ _id: req.params.id, ownerId: ownerOf(req) });
  if (!b) throw new HttpError(404, 'Bill not found');
  res.json({ ok: true });
});

export default router;
