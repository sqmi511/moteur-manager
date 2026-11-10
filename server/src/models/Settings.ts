import { Schema, model, Types } from 'mongoose';

export interface ISettings {
  ownerId: Types.ObjectId;
  billingModes: { perKwh: boolean; perAmp: boolean };
  pricePerKwh: number;
  pricePerAmp: number;
  fixedFee: number;
  currency: 'USD' | 'LBP' | 'both';
  exchangeRate: number;
  ownerName: string;
  phone: string;
  address: string;
  logoPath: string;
  footerNote: string;
}

const schema = new Schema<ISettings>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    billingModes: {
      perKwh: { type: Boolean, default: true },
      perAmp: { type: Boolean, default: true },
    },
    // All prices are stored in USD. LBP amounts are computed with exchangeRate.
    pricePerKwh: { type: Number, default: 0.3, min: 0 },
    pricePerAmp: { type: Number, default: 10, min: 0 },
    fixedFee: { type: Number, default: 0, min: 0 },
    currency: { type: String, enum: ['USD', 'LBP', 'both'], default: 'USD' },
    exchangeRate: { type: Number, default: 89500, min: 1 },
    ownerName: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    logoPath: { type: String, default: '' },
    footerNote: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

export const Settings = model<ISettings>('Settings', schema);
