import { Schema, model, Types } from 'mongoose';

export interface IUser {
  _id: Types.ObjectId;
  role: 'admin' | 'moteur';
  name: string;
  username: string;
  passwordHash: string;
  active: boolean;
  createdAt: Date;
}

const schema = new Schema<IUser>(
  {
    role: { type: String, enum: ['admin', 'moteur'], required: true },
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', schema);
