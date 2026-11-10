import { Currency } from './types';

export const AR_MONTHS = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];

export const toMonth = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export const currentMonth = () => toMonth(new Date());

export const monthLabelAr = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return `${AR_MONTHS[mo - 1]} ${y}`;
};
export const monthLabel = (m: string, lang: string) => {
  if (lang === 'ar') return monthLabelAr(m);
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const num = (n: number, max = 2) => n.toLocaleString('en-US', { maximumFractionDigits: max });
export const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const lbp = (n: number, label = 'LBP') => `${Math.round(n).toLocaleString('en-US')} ${label}`;

export function money(amount: number, currency: Currency, rate: number, usdOnlyWhenBoth = false): string {
  if (currency === 'USD') return usd(amount);
  if (currency === 'LBP') return lbp(amount * rate);
  return usdOnlyWhenBoth ? usd(amount) : `${usd(amount)} · ${lbp(amount * rate)}`;
}

export const chunk = <T,>(a: T[], n: number): T[][] => {
  const r: T[][] = [];
  for (let i = 0; i < a.length; i += n) r.push(a.slice(i, i + n));
  return r;
};

export const toNum = (s: string): number | null => {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isNaN(n) ? null : n;
};
