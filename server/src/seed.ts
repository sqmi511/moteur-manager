import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from './config';
import { User } from './models/User';
import { Settings } from './models/Settings';
import { Subscriber } from './models/Subscriber';
import { Bill, Counter, nextInvoiceNo } from './models/Bill';
import { calcTotal, round2, statusOf } from './lib/billing';

const monthAgo = (n: number) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const rnd = (a: number, b: number) => Math.floor(a + Math.random() * (b - a + 1));

const NAMES = [
  'أحمد خليل', 'محمد حسن', 'علي ناصر', 'حسين فرحات', 'فاطمة الزين',
  'خديجة سليمان', 'يوسف كرم', 'مريم عبّاس', 'إبراهيم شحادة', 'زينب مرتضى',
  'ربيع حداد', 'سامي منصور', 'هدى بدران', 'نادر عيسى', 'ليلى صالح',
];

async function main() {
  await mongoose.connect(config.mongoUri);
  await Promise.all([User.deleteMany({}), Settings.deleteMany({}), Subscriber.deleteMany({}), Bill.deleteMany({}), Counter.deleteMany({})]);

  await User.create({ role: 'admin', name: 'Administrator', username: 'admin', passwordHash: await bcrypt.hash('admin123', 10) });
  const owner = await User.create({ role: 'moteur', name: 'أبو أحمد للمولدات', username: 'moteur1', passwordHash: await bcrypt.hash('owner123', 10) });

  const settings = await Settings.create({
    ownerId: owner._id,
    billingModes: { perKwh: true, perAmp: true },
    pricePerKwh: 0.35,
    pricePerAmp: 12,
    fixedFee: 2,
    currency: 'both',
    exchangeRate: 89500,
    ownerName: 'أبو أحمد للمولدات',
    phone: '03 123 456',
    address: 'الضيعة - الشارع العام',
    footerNote: 'شكراً لتعاملكم معنا. يرجى الدفع قبل نهاية الشهر.',
  });

  const subs = await Subscriber.insertMany(
    NAMES.map((name, i) => ({
      ownerId: owner._id,
      name,
      phone: `03 ${rnd(100, 999)} ${rnd(100, 999)}`,
      billingType: i % 3 === 2 ? 'perAmp' : 'perKwh',
      amps: i % 3 === 2 ? [5, 10, 15][i % 3 === 2 ? rnd(0, 2) : 0] : 0,
      active: true,
    }))
  );

  const reading = new Map<string, number>(subs.map((s) => [String(s._id), rnd(1000, 5000)]));
  for (const offset of [2, 1]) {
    const month = monthAgo(offset);
    for (const s of subs) {
      const prev = reading.get(String(s._id))!;
      const usage = s.billingType === 'perKwh' ? rnd(80, 420) : 0;
      const curr = s.billingType === 'perKwh' ? prev + usage : 0;
      const unit = s.billingType === 'perKwh' ? settings.pricePerKwh : settings.pricePerAmp;
      const total = calcTotal(s.billingType, unit, settings.fixedFee, usage, s.amps);
      const roll = Math.random();
      const paid = offset === 2 || roll < 0.55 ? total : roll < 0.75 ? round2(total / 2) : 0;
      await Bill.create({
        ownerId: owner._id,
        subscriberId: s._id,
        subscriberName: s.name,
        month,
        invoiceNo: await nextInvoiceNo(owner._id),
        billingType: s.billingType,
        prevReading: s.billingType === 'perKwh' ? prev : 0,
        currReading: curr,
        kwh: usage,
        amps: s.amps,
        unitPrice: unit,
        fixedFee: settings.fixedFee,
        currency: settings.currency,
        exchangeRate: settings.exchangeRate,
        total,
        paidAmount: paid,
        status: statusOf(total, paid),
      });
      if (s.billingType === 'perKwh') reading.set(String(s._id), curr);
    }
  }

  console.log('\n✔ Seed complete\n');
  console.log('  Admin : admin    / admin123');
  console.log('  Owner : moteur1  / owner123');
  console.log(`  ${subs.length} subscribers, bills for ${monthAgo(2)} and ${monthAgo(1)}\n`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
