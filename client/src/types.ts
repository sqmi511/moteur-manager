export type Role = 'admin' | 'moteur';
export interface AuthUser { id: string; role: Role; name: string; username: string }
export interface Owner { _id: string; name: string; username: string; active: boolean; createdAt: string }

export type BillingType = 'perKwh' | 'perAmp';
export type Currency = 'USD' | 'LBP' | 'both';
export type BillStatus = 'paid' | 'partial' | 'unpaid';

export interface Settings {
  billingModes: { perKwh: boolean; perAmp: boolean };
  pricePerKwh: number;
  pricePerAmp: number;
  fixedFee: number;
  currency: Currency;
  exchangeRate: number;
  ownerName: string;
  phone: string;
  address: string;
  logoPath: string;
  footerNote: string;
}

export interface Subscriber {
  _id: string;
  name: string;
  phone: string;
  billingType: BillingType;
  amps: number;
  active: boolean;
}

export interface Bill {
  _id: string;
  subscriberId: string;
  subscriberName: string;
  month: string;
  invoiceNo: number;
  billingType: BillingType;
  prevReading: number;
  currReading: number;
  kwh: number;
  amps: number;
  unitPrice: number;
  fixedFee: number;
  currency: Currency;
  exchangeRate: number;
  total: number;
  paidAmount: number;
  status: BillStatus;
}
