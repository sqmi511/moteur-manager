import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { api, errMsg } from '../api';
import { useSettings } from '../settings';
import { currentMonth, monthLabel, money, num } from '../utils';
import MonthPicker from '../components/MonthPicker';
import Money from '../components/Money';
import AnimatedNumber from '../components/AnimatedNumber';
import { EmptyState, ErrorState, Loading, StatusBadge } from '../components/States';
import { listContainer, listItem } from '../components/motion';

interface Dash {
  month: string;
  totals: { billed: number; collected: number; unpaid: number; billCount: number; paidCount: number; partialCount: number; unpaidCount: number };
  outstandingAll: number;
  subscriberCount: number;
  topConsumers: { subscriberId: string; name: string; kwh: number; total: number }[];
  unpaidList: { id: string; subscriberName: string; month: string; invoiceNo: number; total: number; paidAmount: number; remaining: number; status: 'paid' | 'partial' | 'unpaid' }[];
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<Dash | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData((await api.get('/dashboard', { params: { month } })).data); }
    catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); }
  }, [month]);
  useEffect(() => { load(); }, [load]);

  const rate = data && data.totals.billed > 0 ? Math.round((data.totals.collected / data.totals.billed) * 100) : 0;
  const maxKwh = data?.topConsumers[0]?.kwh || 1;
  const fmt = (v: number) => money(v, settings.currency, settings.exchangeRate, true);

  return (
    <>
      <div className="page-head">
        <div>
          <h2>{t('dash.title')}</h2>
          <p className="muted">{monthLabel(month, i18n.language)}</p>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {loading && !data ? <Loading /> : error ? <ErrorState message={error} onRetry={load} /> : data && (
        <>
          <motion.div className="stats" variants={listContainer} initial="hidden" animate="show" key={month}>
            <motion.div className="stat" variants={listItem}>
              <span className="stat-label">{t('dash.billed')}</span>
              <Money value={data.totals.billed} />
              <span className="stat-foot">{data.totals.billCount} {t('dash.invoices')}</span>
            </motion.div>
            <motion.div className="stat stat-ok" variants={listItem}>
              <span className="stat-label">{t('dash.collected')}</span>
              <Money value={data.totals.collected} />
              <span className="stat-foot">{t('dash.collectionRate')}: <AnimatedNumber value={rate} format={(n) => `${Math.round(n)}%`} /></span>
            </motion.div>
            <motion.div className="stat stat-warn" variants={listItem}>
              <span className="stat-label">{t('dash.unpaid')}</span>
              <Money value={data.totals.unpaid} />
              <span className="stat-foot">{data.totals.unpaidCount + data.totals.partialCount} {t('dash.invoices')}</span>
            </motion.div>
            <motion.div className="stat" variants={listItem}>
              <span className="stat-label">{t('dash.outstanding')}</span>
              <Money value={data.outstandingAll} />
              <span className="stat-foot">{data.subscriberCount} {t('dash.subscribers')}</span>
            </motion.div>
          </motion.div>

          <div className="two-col">
            <section className="card">
              <h3>{t('dash.topConsumers')}</h3>
              {data.topConsumers.length === 0 ? (
                <EmptyState title={t('dash.noTop')} />
              ) : (
                <motion.ul className="rank" variants={listContainer} initial="hidden" animate="show" key={month + 'top'}>
                  {data.topConsumers.map((c, i) => (
                    <motion.li key={c.subscriberId} variants={listItem}>
                      <div className="rank-row"><span>{i + 1}. {c.name}</span><b>{num(c.kwh)} kWh</b></div>
                      <div className="bar"><motion.i initial={{ width: 0 }} animate={{ width: `${(c.kwh / maxKwh) * 100}%` }} transition={{ duration: 0.8, delay: 0.2 + i * 0.06 }} /></div>
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </section>

            <section className="card">
              <h3>{t('dash.unpaidList')}</h3>
              {data.unpaidList.length === 0 ? (
                <EmptyState title={t('dash.noUnpaid')} />
              ) : (
                <motion.ul className="plain-list" variants={listContainer} initial="hidden" animate="show" key={month + 'unpaid'}>
                  {data.unpaidList.map((b) => (
                    <motion.li key={b.id} variants={listItem}>
                      <div>
                        <b>{b.subscriberName}</b>
                        <div className="muted small">#{b.invoiceNo} · {monthLabel(b.month, i18n.language)}</div>
                      </div>
                      <div className="end">
                        <b>{fmt(b.remaining)}</b>
                        <StatusBadge status={b.status} />
                      </div>
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
