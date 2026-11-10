import { FormEvent, useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { api, errMsg } from '../api';
import { Owner } from '../types';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { listContainer, listItem } from '../components/motion';

interface Form { name: string; username: string; password: string }
const EMPTY: Form = { name: '', username: '', password: '' };

export default function Owners() {
  const { t } = useTranslation();
  const [owners, setOwners] = useState<Owner[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<null | { mode: 'create' } | { mode: 'edit'; owner: Owner }>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try { setOwners((await api.get('/users')).data); } catch (e) { setError(errMsg(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY); setModal({ mode: 'create' }); };
  const openEdit = (o: Owner) => { setForm({ name: o.name, username: o.username, password: '' }); setModal({ mode: 'edit', owner: o }); };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!modal) return;
    setBusy(true);
    try {
      if (modal.mode === 'create') {
        await api.post('/users', form);
        toast.success(t('owners.created'));
      } else {
        await api.patch(`/users/${modal.owner._id}`, { name: form.name, ...(form.password ? { password: form.password } : {}) });
        toast.success(t('owners.updated'));
      }
      setModal(null);
      load();
    } catch (err) { toast.error(errMsg(err)); }
    finally { setBusy(false); }
  };

  const toggle = async (o: Owner) => {
    try {
      await api.patch(`/users/${o._id}`, { active: !o.active });
      toast.success(o.active ? t('owners.disabledMsg') : t('owners.enabledMsg'));
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <>
      <div className="page-head">
        <h2>{t('owners.title')}</h2>
        <Button onClick={openCreate}>+ {t('owners.new')}</Button>
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : !owners ? <Loading /> : owners.length === 0 ? (
        <div className="card"><EmptyState title={t('owners.empty')} hint={t('owners.emptyHint')} action={<Button onClick={openCreate}>+ {t('owners.new')}</Button>} /></div>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>{t('common.name')}</th><th>{t('auth.username')}</th><th>{t('common.status')}</th><th>{t('owners.createdAt')}</th><th /></tr></thead>
            <motion.tbody variants={listContainer} initial="hidden" animate="show">
              {owners.map((o) => (
                <motion.tr key={o._id} variants={listItem}>
                  <td><b>{o.name}</b></td>
                  <td className="ltr-text">{o.username}</td>
                  <td><span className={`badge ${o.active ? 'badge-paid' : 'badge-unpaid'}`}>{o.active ? t('common.enabled') : t('common.disabled')}</span></td>
                  <td className="muted">{new Date(o.createdAt).toLocaleDateString('en-GB')}</td>
                  <td className="actions">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(o)}>{t('common.edit')}</Button>
                    <Button size="sm" variant={o.active ? 'danger' : 'soft'} onClick={() => toggle(o)}>{o.active ? t('owners.disable') : t('owners.enable')}</Button>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? t('owners.edit') : t('owners.new')}>
        <form onSubmit={save} className="form">
          <label className="field"><span>{t('common.name')}</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} autoFocus /></label>
          <label className="field"><span>{t('auth.username')}</span><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required minLength={3} disabled={modal?.mode === 'edit'} autoComplete="off" /></label>
          <label className="field">
            <span>{t('auth.password')}</span>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={modal?.mode === 'create'} minLength={6} autoComplete="new-password" />
            {modal?.mode === 'edit' && <small className="muted">{t('owners.passwordKeep')}</small>}
          </label>
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setModal(null)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={busy}>{t('common.save')}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
