import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { api, errMsg } from '../api';
import { useSettings } from '../settings';
import { BillingType, Subscriber } from '../types';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { listContainer, listItem } from '../components/motion';

interface Form { name: string; phone: string; billingType: BillingType; amps: string; active: boolean }
const EMPTY: Form = { name: '', phone: '', billingType: 'perKwh', amps: '', active: true };

export default function Subscribers() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [subs, setSubs] = useState<Subscriber[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Subscriber | 'new' | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [deleting, setDeleting] = useState<Subscriber | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try { setSubs((await api.get('/subscribers')).data); } catch (e) { setError(errMsg(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (subs ?? []).filter((x) => !s || x.name.toLowerCase().includes(s) || x.phone.toLowerCase().includes(s));
  }, [subs, q]);

  const openNew = () => {
    const type: BillingType = settings.billingModes.perKwh ? 'perKwh' : 'perAmp';
    setForm({ ...EMPTY, billingType: type });
    setEditing('new');
  };
  const openEdit = (s: Subscriber) => {
    setForm({ name: s.name, phone: s.phone, billingType: s.billingType, amps: s.amps ? String(s.amps) : '', active: s.active });
    setEditing(s);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const body = { name: form.name, phone: form.phone, billingType: form.billingType, amps: form.billingType === 'perAmp' ? Number(form.amps) || 0 : 0, active: form.active };
    try {
      if (editing === 'new') await api.post('/subscribers', body);
      else if (editing) await api.put(`/subscribers/${editing._id}`, body);
      toast.success(t('subs.saved'));
      setEditing(null);
      load();
    } catch (err) { toast.error(errMsg(err)); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.delete(`/subscribers/${deleting._id}`);
      toast.success(t('subs.deleted'));
      setDeleting(null);
      load();
    } catch (err) { toast.error(errMsg(err)); }
    finally { setBusy(false); }
  };

  const typeLabel = (b: BillingType) => (b === 'perKwh' ? t('subs.perKwh') : t('subs.perAmp'));

  return (
    <>
      <div className="page-head">
        <h2>{t('subs.title')}{subs && <span className="count">{subs.length}</span>}</h2>
        <div className="toolbar">
          <input className="search" type="search" placeholder={t('subs.searchPh')} value={q} onChange={(e) => setQ(e.target.value)} />
          <Button onClick={openNew}>+ {t('subs.add')}</Button>
        </div>
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : !subs ? <Loading /> : subs.length === 0 ? (
        <div className="card"><EmptyState title={t('subs.empty')} hint={t('subs.emptyHint')} action={<Button onClick={openNew}>+ {t('subs.add')}</Button>} /></div>
      ) : filtered.length === 0 ? (
        <div className="card"><EmptyState title={t('subs.noResults')} /></div>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>{t('common.name')}</th><th>{t('common.phone')}</th><th>{t('subs.billingType')}</th><th>{t('subs.amps')}</th><th>{t('common.status')}</th><th /></tr></thead>
            <motion.tbody variants={listContainer} initial="hidden" animate="show" key={q}>
              {filtered.map((s) => (
                <motion.tr key={s._id} variants={listItem}>
                  <td><b>{s.name}</b></td>
                  <td className="ltr-text">{s.phone || '—'}</td>
                  <td><span className="badge badge-type">{typeLabel(s.billingType)}</span>{!settings.billingModes[s.billingType] && <span className="warn-dot" title={t('subs.modeDisabled')}> ⚠</span>}</td>
                  <td>{s.billingType === 'perAmp' ? `${s.amps} A` : '—'}</td>
                  <td><span className={`badge ${s.active ? 'badge-paid' : 'badge-unpaid'}`}>{s.active ? t('common.active') : t('common.disabled')}</span></td>
                  <td className="actions">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>{t('common.edit')}</Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleting(s)}>{t('common.delete')}</Button>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? t('subs.add') : t('subs.edit')}>
        <form onSubmit={save} className="form">
          <label className="field"><span>{t('common.name')}</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus /></label>
          <label className="field"><span>{t('common.phone')}</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" /></label>
          <div className="form-grid">
            <label className="field">
              <span>{t('subs.billingType')}</span>
              <select value={form.billingType} onChange={(e) => setForm({ ...form, billingType: e.target.value as BillingType })}>
                <option value="perKwh">{t('subs.perKwh')}</option>
                <option value="perAmp">{t('subs.perAmp')}</option>
              </select>
            </label>
            {form.billingType === 'perAmp' && (
              <label className="field"><span>{t('subs.amps')}</span><input type="number" min="1" step="any" value={form.amps} onChange={(e) => setForm({ ...form, amps: e.target.value })} required /></label>
            )}
          </div>
          {!settings.billingModes[form.billingType] && <p className="note-warn">{t('subs.modeDisabled')}</p>}
          <label className="check"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> {t('common.active')}</label>
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={busy}>{t('common.save')}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title={t('subs.deleteTitle')} width={420}
        footer={<div className="modal-actions"><Button variant="ghost" onClick={() => setDeleting(null)}>{t('common.cancel')}</Button><Button variant="danger" loading={busy} onClick={remove}>{t('common.delete')}</Button></div>}>
        <p>{t('subs.deleteMsg', { name: deleting?.name })}</p>
      </Modal>
    </>
  );
}
