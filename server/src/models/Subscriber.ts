import { Schema, model, Types } from 'mongoose';

export interface ISubscriber {
  ownerId: Types.ObjectId;
  name: string;
  phone: string;
  billingType: 'perKwh' | 'perAmp';
  amps: number;
  active: boolean;
}

const schema = new Schema<ISubscriber>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: '', trim: true },
    billingType: { type: String, enum: ['perKwh', 'perAmp'], required: true },
    amps: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Subscriber = model<ISubscriber>('Subscriber', schema);
