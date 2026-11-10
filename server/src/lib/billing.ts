export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function calcTotal(type: 'perKwh' | 'perAmp', unitPrice: number, fixedFee: number, kwh: number, amps: number) {
  const usage = type === 'perKwh' ? kwh : amps;
  return round2(usage * unitPrice + fixedFee);
}

export function statusOf(total: number, paid: number): 'paid' | 'partial' | 'unpaid' {
  if (paid >= total - 0.005) return 'paid';
  if (paid > 0) return 'partial';
  return 'unpaid';
}

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
