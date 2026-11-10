import { Router } from 'express';
import { z } from 'zod';
import { Bill } from '../models/Bill';
import { Subscriber } from '../models/Subscriber';
import { requireAuth, requireRole, ownerOf } from '../middleware/auth';
import { MONTH_RE, round2 } from '../lib/billing';

const router = Router();
router.use(requireAuth, requireRole('moteur'));

router.get('/', async (req, res) => {
  const ownerId = ownerOf(req);
  const now = new Date();
  const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const month = z.string().regex(MONTH_RE).default(fallback).parse(req.query.month || undefined);

  const bills = await Bill.find({ ownerId, month });
  const billed = round2(bills.reduce((s, b) => s + b.total, 0));
  const collected = round2(bills.reduce((s, b) => s + b.paidAmount, 0));

  const topConsumers = bills
    .filter((b) => b.billingType === 'perKwh' && b.kwh > 0)
    .sort((a, b) => b.kwh - a.kwh)
    .slice(0, 5)
    .map((b) => ({ subscriberId: b.subscriberId, name: b.subscriberName, kwh: b.kwh, total: b.total }));

  const unpaid = await Bill.find({ ownerId, status: { $ne: 'paid' } })
    .sort({ month: -1, invoiceNo: -1 })
    .limit(20);

  const outstanding = await Bill.aggregate([
    { $match: { ownerId, status: { $ne: 'paid' } } },
    { $group: { _id: null, v: { $sum: { $subtract: ['$total', '$paidAmount'] } } } },
  ]);

  res.json({
    month,
    totals: {
      billed,
      collected,
      unpaid: round2(billed - collected),
      billCount: bills.length,
      paidCount: bills.filter((b) => b.status === 'paid').length,
      partialCount: bills.filter((b) => b.status === 'partial').length,
      unpaidCount: bills.filter((b) => b.status === 'unpaid').length,
    },
    outstandingAll: round2(outstanding[0]?.v ?? 0),
    subscriberCount: await Subscriber.countDocuments({ ownerId, active: true }),
    topConsumers,
    unpaidList: unpaid.map((b) => ({
      id: b.id,
      subscriberName: b.subscriberName,
      month: b.month,
      invoiceNo: b.invoiceNo,
      total: b.total,
      paidAmount: b.paidAmount,
      remaining: round2(b.total - b.paidAmount),
      status: b.status,
    })),
  });
});

export default router;
