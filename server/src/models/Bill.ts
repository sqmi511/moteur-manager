import { Schema, model, Types } from 'mongoose';

export interface IBill {
  ownerId: Types.ObjectId;
  subscriberId: Types.ObjectId;
  subscriberName: string; // snapshot, used on invoices
  month: string; // YYYY-MM
  invoiceNo: number; // sequential per owner
  billingType: 'perKwh' | 'perAmp';
  prevReading: number;
  currReading: number;
  kwh: number;
  amps: number;
  // price snapshot (so old invoices never change when prices change)
  unitPrice: number;
  fixedFee: number;
  currency: 'USD' | 'LBP' | 'both';
  exchangeRate: number;
  total: number; // in USD
  paidAmount: number; // in USD
  status: 'paid' | 'partial' | 'unpaid';
}

const schema = new Schema<IBill>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subscriberId: { type: Schema.Types.ObjectId, ref: 'Subscriber', required: true },
    subscriberName: { type: String, required: true },
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    invoiceNo: { type: Number, required: true },
    billingType: { type: String, enum: ['perKwh', 'perAmp'], required: true },
    prevReading: { type: Number, default: 0 },
    currReading: { type: Number, default: 0 },
    kwh: { type: Number, default: 0 },
    amps: { type: Number, default: 0 },
    unitPrice: { type: Number, required: true },
    fixedFee: { type: Number, default: 0 },
    currency: { type: String, enum: ['USD', 'LBP', 'both'], default: 'USD' },
    exchangeRate: { type: Number, default: 1 },
    total: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['paid', 'partial', 'unpaid'], default: 'unpaid' },
  },
  { timestamps: true }
);

schema.index({ ownerId: 1, subscriberId: 1, month: 1 }, { unique: true });
schema.index({ ownerId: 1, invoiceNo: 1 }, { unique: true });

export const Bill = model<IBill>('Bill', schema);

// Sequential invoice numbers per owner
const counterSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, required: true, unique: true },
  seq: { type: Number, default: 0 },
});
export const Counter = model('Counter', counterSchema);

export async function nextInvoiceNo(ownerId: Types.ObjectId): Promise<number> {
  const c = await Counter.findOneAndUpdate({ ownerId }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return c!.seq as number;
}
