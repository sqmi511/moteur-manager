import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { api, errMsg } from '../api';
import { useSettings } from '../settings';
import { Bill } from '../types';
import { chunk, currentMonth } from '../utils';
import Button from '../components/Button';
import MonthPicker from '../components/MonthPicker';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { Printer } from '../components/Icons';
import { CopyType, Sheet, PER_PAGE } from '../components/Invoice';

type CopyChoice = CopyType | 'all';

export default function PrintPage() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [month, setMonth] = useState(currentMonth());
  const [bills, setBills] = useState<Bill[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [copy, setCopy] = useState<CopyChoice>('subscriber');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data: Bill[] = (await api.get('/bills', { params: { month } })).data;
      setBills(data);
      setSelected(new Set(data.map((b) => b._id)));
    } catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); }
  }, [month]);
  useEffect(() => { load(); }, [load]);

  const copies: CopyType[] = copy === 'all' ? ['subscriber', 'owner', 'archive'] : [copy];
  const chosen = useMemo(() => (bills ?? []).filter((b) => selected.has(b._id)), [bills, selected]);
  const pages = useMemo(() => chunk(chosen, PER_PAGE), [chosen]);
  const totalSheets = pages.length * copies.length;
  const visible = (bills ?? []).filter((b) => !filter.trim() || b.subscriberName.toLowerCase().includes(filter.trim().toLowerCase()));

  const toggle = (id: string) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const copyOptions: { v: CopyChoice; label: string }[] = [
    { v: 'subscriber', label: t('print.copySubscriber') },
    { v: 'owner', label: t('print.copyOwner') },
    { v: 'archive', label: t('print.copyArchive') },
    { v: 'all', label: t('print.copyAll') },
  ];

  return (
    <div className="print-page">
      <div className="no-print">
        <div className="page-head">
          <h2>{t('print.title')}</h2>
          <MonthPicker value={month} onChange={setMonth} />
        </div>

        {error ? <ErrorState message={error} onRetry={load} /> : loading && !bills ? <Loading /> : !bills || bills.length === 0 ? (
          <div className="card"><EmptyState title={t('print.noBills')} hint={t('print.noBillsHint')} /></div>
        ) : (
          <div className="print-controls">
            <section className="card">
              <div className="card-head">
                <h3>{t('print.selectInvoices')} <span className="count">{selected.size}/{bills.length}</span></h3>
                <div className="toolbar">
                  <Button size="sm" variant="soft" onClick={() => setSelected(new Set(bills.map((b) => b._id)))}>{t('print.selectAll')}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>{t('print.selectNone')}</Button>
                </div>
              </div>
              <input className="search" type="search" placeholder={t('common.search')} value={filter} onChange={(e) => setFilter(e.target.value)} />
              <ul className="pick-list">
                {visible.map((b) => (
                  <li key={b._id}>
                    <label className="check"><input type="checkbox" checked={selected.has(b._id)} onChange={() => toggle(b._id)} /> <span>#{b.invoiceNo} · {b.subscriberName}</span></label>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card">
              <h3>{t('print.copy')}</h3>
              <div className="segmented">
                {copyOptions.map((o) => (
                  <button key={o.v} className={copy === o.v ? 'on' : ''} onClick={() => setCopy(o.v)}>
                    {copy === o.v && <motion.i layoutId="copy-pill" className="pill" />}<span>{o.label}</span>
                  </button>
                ))}
              </div>
              {copy === 'all' && <p className="muted small">{t('print.allHint')}</p>}

        

              <div className="print-summary">
                <span>{t('print.summary', { invoices: chosen.length, sheets: totalSheets })}</span>
                <Button onClick={() => window.print()} disabled={chosen.length === 0}><Printer /> {t('print.printNow')}</Button>
              </div>
              <p className="muted small">{t('print.tip')}</p>
            </section>
          </div>
        )}
      </div>

      {bills && chosen.length > 0 && (
        <div className="preview-wrap">
          <div className="sheet-scale">
            {copies.flatMap((c) =>
              pages.map((p, i) => (
                <div key={`${c}-${i}`} className="sheet-block">
                  <div className="sheet-caption no-print">{t(`print.copy_${c}`)} — {i + 1}/{pages.length}</div>
                  <Sheet bills={p} settings={settings} copy={c} />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
