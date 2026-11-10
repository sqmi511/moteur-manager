import { useCallback, useEffect, useMemo, useState, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { api, errMsg } from '../api';
import { useSettings } from '../settings';
import { Bill, Settings, Subscriber } from '../types';
import { currentMonth, money, num, round2, toNum, usd } from '../utils';
import Button from '../components/Button';
import Modal from '../components/Modal';
import MonthPicker from '../components/MonthPicker';
import AnimatedNumber from '../components/AnimatedNumber';
import { EmptyState, ErrorState, Loading, StatusBadge } from '../components/States';
import { listContainer, listItem } from '../components/motion';

interface Entry { subscriber: Subscriber; bill: Bill | null; prevReading: number; hasPrevious: boolean }
interface Edit { prev: string; curr: string; amps: string; include: boolean }

function compute(r: Entry, e: Edit, s: Settings, refresh: boolean) {
  const sub = r.subscriber;
  const keep = !!r.bill && !refresh && r.bill.billingType === sub.billingType;
  const unit = keep ? r.bill!.unitPrice : sub.billingType === 'perKwh' ? s.pricePerKwh : s.pricePerAmp;
  const fee = keep ? r.bill!.fixedFee : s.fixedFee;
  if (sub.billingType === 'perKwh') {
    const curr = toNum(e.curr);
    const prev = toNum(e.prev) ?? 0;
    if (curr === null) return { included: false, valid: true, kwh: 0, total: null as number | null };
    if (curr < prev) return { included: true, valid: false, kwh: 0, total: null };
    const kwh = round2(curr - prev);
    return { included: true, valid: true, kwh, total: round2(kwh * unit + fee) };
  }
  if (!e.include) return { included: false, valid: true, kwh: 0, total: null };
  const a = toNum(e.amps);
  if (a === null || a <= 0) return { included: true, valid: false, kwh: 0, total: null };
  return { included: true, valid: true, kwh: 0, total: round2(a * unit + fee) };
}

export default function Billing() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [payBill, setPayBill] = useState<Bill | null>(null);
  const [payAmount, setPayAmount] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data: Entry[] = (await api.get('/bills/entries', { params: { month } })).data;
      const e: Record<string, Edit> = {};
      for (const r of data) {
        const b = r.bill;
        e[r.subscriber._id] = {
          prev: String(r.prevReading),
          curr: b && r.subscriber.billingType === 'perKwh' ? String(b.currReading) : '',
          amps: String(b && b.amps ? b.amps : r.subscriber.amps || ''),
          include: r.subscriber.billingType === 'perAmp',
        };
      }
      setRows(data); setEdits(e);
    } catch (err) { setError(errMsg(err)); }
    finally { setLoading(false); }
  }, [month]);
  useEffect(() => { load(); }, [load]);

  const setEdit = (id: string, patch: Partial<Edit>) => setEdits((p) => ({ ...p, [id]: { ...p[id], ...patch } }));

  const calc = useMemo(() => {
    const out = new Map<string, ReturnType<typeof compute>>();
    (rows ?? []).forEach((r) => { const e = edits[r.subscriber._id]; if (e) out.set(r.subscriber._id, compute(r, e, settings, refresh)); });
    return out;
  }, [rows, edits, settings, refresh]);

  const includedRows = (rows ?? []).filter((r) => calc.get(r.subscriber._id)?.included && settings.billingModes[r.subscriber.billingType]);
  const grandTotal = round2(includedRows.reduce((s, r) => s + (calc.get(r.subscriber._id)?.total ?? 0), 0));

  const nav = (e: KeyboardEvent<HTMLInputElement>, i: number) => {
    const d = e.key === 'Enter' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = document.querySelector<HTMLInputElement>(`input[data-nav="${i + d}"]`);
    if (next) { next.focus(); next.select(); }
  };

  const generate = async () => {
    if (includedRows.some((r) => !calc.get(r.subscriber._id)!.valid)) return toast.error(t('billing.invalidRow'));
    if (includedRows.length === 0) return toast.error(t('billing.nothing'));
    setSaving(true);
    try {
      const entries = includedRows.map((r) => {
        const e = edits[r.subscriber._id];
        return r.subscriber.billingType === 'perKwh'
          ? { subscriberId: r.subscriber._id, prevReading: toNum(e.prev) ?? 0, currReading: toNum(e.curr)! }
          : { subscriberId: r.subscriber._id, amps: toNum(e.amps)! };
      });
      const res = (await api.post('/bills/bulk', { month, refreshPrices: refresh, entries })).data;
      toast.success(t('billing.generated', { created: res.created, updated: res.updated }));
      res.errors.slice(0, 3).forEach((x: { name: string; message: string }) => toast.error(`${x.name}: ${x.message}`));
      setRefresh(false);
      load();
    } catch (err) { toast.error(errMsg(err)); }
    finally { setSaving(false); }
  };

  const openPay = (b: Bill) => { setPayBill(b); setPayAmount(String(b.paidAmount)); };
  const savePay = async (amount: number) => {
    if (!payBill) return;
    setSaving(true);
    try {
      await api.patch(`/bills/${payBill._id}/payment`, { paidAmount: amount });
      toast.success(t('common.saved'));
      setPayBill(null);
      load();
    } catch (err) { toast.error(errMsg(err)); }
    finally { setSaving(false); }
  };

  const fmt = (v: number) => money(v, settings.currency, settings.exchangeRate, true);

  return (
    <>
      <div className="page-head">
        <div><h2>{t('billing.title')}</h2><p className="muted">{t('billing.hint')}</p></div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : loading && !rows ? <Loading /> : !rows || rows.length === 0 ? (
        <div className="card"><EmptyState title={t('billing.noSubs')} hint={t('subs.emptyHint')} /></div>
      ) : (
        <>
          <div className="card table-wrap billing-grid" style={{ opacity: loading ? 0.6 : 1 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th><th>{t('nav.subscribers')}</th><th>{t('subs.billingType')}</th>
                  <th>{t('billing.previous')}</th><th>{t('billing.current')}</th><th>{t('billing.kwh')}</th>
                  <th>{t('common.total')}</th><th>{t('common.status')}</th>
                </tr>
              </thead>
              <motion.tbody variants={listContainer} initial="hidden" animate="show" key={month}>
                {rows.map((r, i) => {
                  const s = r.subscriber; const e = edits[s._id]; const c = calc.get(s._id);
                  if (!e || !c) return null;
                  const off = !settings.billingModes[s.billingType];
                  return (
                    <motion.tr key={s._id} variants={listItem} className={off ? 'row-off' : c.included ? 'row-on' : ''}>
                      <td className="muted">{i + 1}</td>
                      <td><b>{s.name}</b>{s.phone && <div className="muted small ltr-text">{s.phone}</div>}</td>
                      <td><span className="badge badge-type">{s.billingType === 'perKwh' ? t('subs.perKwh') : t('subs.perAmp')}</span></td>
                      <td>
                        {s.billingType === 'perKwh'
                          ? <input className="cell-input" inputMode="decimal" tabIndex={-1} value={e.prev} disabled={off} onChange={(ev) => setEdit(s._id, { prev: ev.target.value })} title={r.hasPrevious ? '' : t('billing.firstReading')} />
                          : <span className="muted">—</span>}
                      </td>
                      <td>
                        {s.billingType === 'perKwh' ? (
                          <input className={`cell-input strong ${!c.valid ? 'bad' : ''}`} inputMode="decimal" data-nav={i} value={e.curr} disabled={off}
                            onChange={(ev) => setEdit(s._id, { curr: ev.target.value })} onKeyDown={(ev) => nav(ev, i)} onFocus={(ev) => ev.target.select()} />
                        ) : (
                          <div className="amp-cell">
                            <input type="checkbox" checked={e.include} disabled={off} onChange={(ev) => setEdit(s._id, { include: ev.target.checked })} aria-label={t('billing.include')} />
                            <input className={`cell-input strong ${!c.valid ? 'bad' : ''}`} inputMode="decimal" data-nav={i} value={e.amps} disabled={off}
                              onChange={(ev) => setEdit(s._id, { amps: ev.target.value, include: true })} onKeyDown={(ev) => nav(ev, i)} onFocus={(ev) => ev.target.select()} />
                            <span className="muted">A</span>
                          </div>
                        )}
                      </td>
                      <td>{s.billingType === 'perKwh' && c.total !== null ? num(c.kwh) : '—'}</td>
                      <td className="num strong-num">{c.total !== null ? fmt(c.total) : r.bill ? fmt(r.bill.total) : '—'}</td>
                      <td>
                        {r.bill ? (
                          <div className="status-cell"><StatusBadge status={r.bill.status} /><button className="link-btn" onClick={() => openPay(r.bill!)}>{t('billing.payment')}</button></div>
                        ) : off ? <span className="warn-dot">⚠ {t('subs.modeDisabled')}</span> : <span className="muted">—</span>}
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          </div>

          <div className="sticky-bar no-print">
            <label className="check"><input type="checkbox" checked={refresh} onChange={(e) => setRefresh(e.target.checked)} /> {t('billing.refresh')}</label>
            <div className="sticky-total">
              <span className="muted">{t('billing.grandTotal')} ({includedRows.length})</span>
              <b><AnimatedNumber value={grandTotal} format={fmt} duration={0.35} /></b>
            </div>
            <Button loading={saving} onClick={generate} disabled={includedRows.length === 0}>{t('billing.generate', { count: includedRows.length })}</Button>
          </div>
        </>
      )}

      <Modal open={!!payBill} onClose={() => setPayBill(null)} title={t('billing.payment')} width={420}>
        {payBill && (
          <div className="form">
            <p><b>{payBill.subscriberName}</b> · #{payBill.invoiceNo}</p>
            <div className="pay-summary">
              <div><span className="muted">{t('common.total')}</span><b>{usd(payBill.total)}</b></div>
              <div><span className="muted">{t('billing.remaining')}</span><b>{usd(Math.max(0, payBill.total - (toNum(payAmount) ?? 0)))}</b></div>
            </div>
            <label className="field">
              <span>{t('billing.paidAmount')} (USD)</span>
              <input inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} autoFocus onFocus={(e) => e.target.select()} />
            </label>
            <div className="modal-actions">
              <Button variant="soft" loading={saving} onClick={() => savePay(payBill.total)}>{t('billing.markPaid')}</Button>
              <Button loading={saving} onClick={() => savePay(toNum(payAmount) ?? 0)}>{t('common.save')}</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
