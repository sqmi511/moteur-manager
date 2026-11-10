import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../auth';
import { errMsg } from '../api';
import Button from '../components/Button';
import LangToggle from '../components/LangToggle';
import { Bolt } from '../components/Icons';

export default function Login() {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(username, password);
      nav(u.role === 'admin' ? '/admin/owners' : '/', { replace: true });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-lang"><LangToggle /></div>
      <motion.form
        className="login-card"
        onSubmit={submit}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 22, stiffness: 220 }}
      >
        <div className="login-logo"><Bolt size={30} /></div>
        <h1>{t('app.name')}</h1>
        <p className="muted">{t('app.tagline')}</p>
        <label className="field">
          <span>{t('auth.username')}</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" required />
        </label>
        <label className="field">
          <span>{t('auth.password')}</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        <Button type="submit" loading={busy} className="btn-block">{t('auth.signIn')}</Button>
      </motion.form>
    </div>
  );
}
