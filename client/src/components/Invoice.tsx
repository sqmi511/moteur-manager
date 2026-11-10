import { CSSProperties, ReactNode, useState } from 'react';
import { Bill, Currency, Settings } from '../types';
import { monthLabelAr, num, usd } from '../utils';

// Invoices are ALWAYS Arabic RTL, independent of the UI language.
export type CopyType = 'subscriber' | 'owner' | 'archive';

export const COPY_LABEL: Record<CopyType, string> = {
  subscriber: 'نسخة المشترك',
  owner: 'نسخة المالك',
  archive: 'نسخة الأرشيف',
};
const STATUS_AR = { paid: 'مدفوعة', partial: 'مدفوعة جزئياً', unpaid: 'غير مدفوعة' } as const;

const Ltr = ({ children }: { children: ReactNode }) => <span className="ltr" dir="ltr">{children}</span>;

function Amount({ amount, currency, rate, stacked = false, compact = false }: {
  amount: number; currency: Currency; rate: number; stacked?: boolean; compact?: boolean;
}) {
  const dollars = <Ltr>{usd(amount)}</Ltr>;
  const pounds = <><Ltr>{Math.round(amount * rate).toLocaleString('en-US')}</Ltr> ل.ل.</>;
  if (currency === 'USD') return <>{dollars}</>;
  if (currency === 'LBP') return <>{pounds}</>;
  if (compact) return <>{dollars}</>;
  return stacked ? <><span className="line">{dollars}</span><span className="line">{pounds}</span></> : <>{dollars} — {pounds}</>;
}

export default function Invoice({ bill, settings, copy }: { bill: Bill; settings: Settings; copy: CopyType }) {
  const [logoOk, setLogoOk] = useState(true);
  const perKwh = bill.billingType === 'perKwh';
  const remaining = Math.max(0, bill.total - bill.paidAmount);
  const info = [settings.phone, settings.address].filter(Boolean).join('  •  ');

  return (
    <div className="invoice" dir="rtl" lang="ar">
      <span className="inv-copy">{COPY_LABEL[copy]}</span>

      <header className="inv-head">
        {settings.logoPath && logoOk && (
          <img className="inv-logo" src={settings.logoPath} alt="" onError={() => setLogoOk(false)} />
        )}
        <h1 className="inv-owner">{settings.ownerName}</h1>
        {info && <p className="inv-info">{info}</p>}
      </header>

      <div className="inv-meta">
        <div><b>رقم الفاتورة</b><span><Ltr>{bill.invoiceNo}</Ltr></span></div>
        <div><b>الشهر</b><span>{monthLabelAr(bill.month)}</span></div>
        <div><b>الحالة</b><span className="inv-status">{STATUS_AR[bill.status]}</span></div>
      </div>

      <div className="inv-name"><b>المشترك:</b> {bill.subscriberName}</div>

      <table className="inv-table">
        <thead>
          <tr>
            {perKwh ? (
              <>
                <th>القراءة السابقة</th><th>القراءة الحالية</th><th>الاستهلاك (ك.و.س)</th><th>سعر الكيلوواط</th>
              </>
            ) : (
              <>
                <th>الاشتراك (أمبير)</th><th>سعر الأمبير</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          <tr>
            {perKwh ? (
              <>
                <td><Ltr>{num(bill.prevReading)}</Ltr></td>
                <td><Ltr>{num(bill.currReading)}</Ltr></td>
                <td><Ltr>{num(bill.kwh)}</Ltr></td>
                <td><Amount amount={bill.unitPrice} currency={bill.currency} rate={bill.exchangeRate} compact /></td>
              </>
            ) : (
              <>
                <td><Ltr>{num(bill.amps)}</Ltr></td>
                <td><Amount amount={bill.unitPrice} currency={bill.currency} rate={bill.exchangeRate} compact /></td>
              </>
            )}
          </tr>
        </tbody>
      </table>

      <div className="inv-bottom">
        <div className="inv-fee">
          <div><span>الاشتراك الثابت</span><b><Amount amount={bill.fixedFee} currency={bill.currency} rate={bill.exchangeRate} compact /></b></div>
          {bill.status === 'partial' && (
            <div><span>المتبقي</span><b><Amount amount={remaining} currency={bill.currency} rate={bill.exchangeRate} compact /></b></div>
          )}
        </div>
        <div className="inv-total">
          <span className="inv-total-label">المبلغ الإجمالي</span>
          <strong><Amount amount={bill.total} currency={bill.currency} rate={bill.exchangeRate} stacked /></strong>
        </div>
      </div>

      {settings.footerNote && <p className="inv-foot">{settings.footerNote}</p>}
    </div>
  );
}

/** Invoices per A4 page, one per row. Use 5 (default) or 6. */
export const PER_PAGE = 5;

export function Sheet({ bills, settings, copy }: { bills: Bill[]; settings: Settings; copy: CopyType }) {
  const cells: (Bill | null)[] = [...bills];
  while (cells.length < PER_PAGE) cells.push(null);
  return (
    <section className={`sheet ${PER_PAGE > 5 ? 'dense' : ''}`} style={{ '--rows': PER_PAGE } as CSSProperties}>
      {cells.map((b, i) => (
        <div className="cell" key={b ? b._id : `empty-${i}`}>
          {b && <Invoice bill={b} settings={settings} copy={copy} />}
        </div>
      ))}
    </section>
  );
}