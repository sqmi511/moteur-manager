import { FormEvent, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { api, errMsg } from '../api';
import { useSettings } from '../settings';
import { Currency, Settings } from '../types';
import Button from '../components/Button';
import { ErrorState, Loading } from '../components/States';
import { Bolt } from '../components/Icons';

interface Form {
  perKwh: boolean; perAmp: boolean;
  pricePerKwh: string; pricePerAmp: string; fixedFee: string;
  currency: Currency; exchangeRate: string;
  ownerName: string; phone: string; address: string; footerNote: string;
}
const toForm = (s: Settings): Form => ({
  perKwh: s.billingModes.perKwh, perAmp: s.billingModes.perAmp,
  pricePerKwh: String(s.pricePerKwh), pricePerAmp: String(s.pricePerAmp), fixedFee: String(s.fixedFee),
  currency: s.currency, exchangeRate: String(s.exchangeRate),
  ownerName: s.ownerName, phone: s.phone, address: s.address, footerNote: s.footerNote,
});

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="switch-row">
      <span className="switch"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><i /></span>
      <span>{label}</span>
    </label>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { settings, ready, error, reload, setSettings } = useSettings();
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const [logoKey, setLogoKey] = useState(0);
  const initialised = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ready && !initialised.current) { initialised.current = true; setForm(toForm(settings)); }
  }, [ready, settings]);
  useEffect(() => setLogoBroken(false), [settings.logoPath, logoKey]);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!form) return <Loading />;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.perKwh && !form.perAmp) return toast.error(t('settings.modesError'));
    setSaving(true);
    try {
      const r = await api.put('/settings', {
        billingModes: { perKwh: form.perKwh, perAmp: form.perAmp },
        pricePerKwh: Number(form.pricePerKwh) || 0, pricePerAmp: Number(form.pricePerAmp) || 0, fixedFee: Number(form.fixedFee) || 0,
        currency: form.currency, exchangeRate: Number(form.exchangeRate) || 1,
        ownerName: form.ownerName, phone: form.phone, address: form.address, footerNote: form.footerNote,
      });
      setSettings({ ...settings, ...r.data });
      toast.success(t('settings.saved'));
    } catch (err) { toast.error(errMsg(err)); }
    finally { setSaving(false); }
  };

  const upload = async (file?: File) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('logo', file);
    setUploading(true);
    try {
      const r = await api.post('/settings/logo', fd);
      setSettings({ ...settings, logoPath: r.data.logoPath });
      setLogoKey(Date.now());
      toast.success(t('settings.logoSaved'));
    } catch (err) { toast.error(errMsg(err)); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  const removeLogo = async () => {
    try {
      await api.delete('/settings/logo');
      setSettings({ ...settings, logoPath: '' });
      toast.success(t('settings.logoRemoved'));
    } catch (err) { toast.error(errMsg(err)); }
  };

  const num = (k: 'pricePerKwh' | 'pricePerAmp' | 'fixedFee' | 'exchangeRate', label: string, disabled = false) => (
    <label className="field">
      <span>{label}</span>
      <input inputMode="decimal" value={form[k]} onChange={(e) => set(k, e.target.value)} disabled={disabled} />
    </label>
  );
  const showLogo = settings.logoPath && !logoBroken;

  return (
    <>
      <div className="page-head"><h2>{t('settings.title')}</h2></div>
      <form onSubmit={save} className="settings-grid">
        <section className="card">
          <h3>{t('settings.business')}</h3>
          <div className="logo-row">
            <div className="logo-box">
              {showLogo
                ? <motion.img key={settings.logoPath + logoKey} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} src={`${settings.logoPath}?v=${logoKey}`} alt="" onError={() => setLogoBroken(true)} />
                : <span className="logo-default"><Bolt size={34} /></span>}
            </div>
            <div className="logo-actions">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={(e) => upload(e.target.files?.[0])} />
              <Button variant="soft" loading={uploading} onClick={() => fileRef.current?.click()}>{t('settings.uploadLogo')}</Button>
              {settings.logoPath && <Button variant="ghost" onClick={removeLogo}>{t('settings.removeLogo')}</Button>}
              <small className="muted">{t('settings.logoHint')}</small>
            </div>
          </div>
          <label className="field"><span>{t('settings.ownerName')}</span><input value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} /></label>
          <div className="form-grid">
            <label className="field"><span>{t('common.phone')}</span><input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></label>
            <label className="field"><span>{t('settings.address')}</span><input value={form.address} onChange={(e) => set('address', e.target.value)} /></label>
          </div>
          <label className="field"><span>{t('settings.footerNote')}</span><textarea rows={2} value={form.footerNote} onChange={(e) => set('footerNote', e.target.value)} /></label>
        </section>

        <section className="card">
          <h3>{t('settings.billing')}</h3>
          <Switch checked={form.perKwh} onChange={(v) => set('perKwh', v)} label={t('settings.perKwh')} />
          <Switch checked={form.perAmp} onChange={(v) => set('perAmp', v)} label={t('settings.perAmp')} />
          <p className="muted small">{t('settings.pricesHint')}</p>
          <div className="form-grid">
            {num('pricePerKwh', t('settings.pricePerKwh'), !form.perKwh)}
            {num('pricePerAmp', t('settings.pricePerAmp'), !form.perAmp)}
            {num('fixedFee', t('settings.fixedFee'))}
          </div>

          <h3 style={{ marginTop: 20 }}>{t('settings.currency')}</h3>
          <div className="form-grid">
            <label className="field">
              <span>{t('settings.currency')}</span>
              <select value={form.currency} onChange={(e) => set('currency', e.target.value as Currency)}>
                <option value="USD">{t('settings.currencyUSD')}</option>
                <option value="LBP">{t('settings.currencyLBP')}</option>
                <option value="both">{t('settings.currencyBoth')}</option>
              </select>
            </label>
            {num('exchangeRate', t('settings.exchangeRate'), form.currency === 'USD')}
          </div>
          <p className="muted small">{t('settings.rateHint')}</p>
        </section>

        <div className="settings-save">
          <Button type="submit" loading={saving}>{t('common.save')}</Button>
        </div>
      </form>
    </>
  );
}
