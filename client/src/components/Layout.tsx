import { NavLink, useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth';
import LangToggle from './LangToggle';
import PageTransition from './PageTransition';
import { Bolt } from './Icons';

export default function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const outlet = useOutlet();

  const links = user?.role === 'admin'
    ? [{ to: '/admin/owners', label: t('nav.owners') }]
    : [
        { to: '/', label: t('nav.dashboard'), end: true },
        { to: '/subscribers', label: t('nav.subscribers') },
        { to: '/billing', label: t('nav.billing') },
        { to: '/print', label: t('nav.print') },
        { to: '/settings', label: t('nav.settings') },
      ];

  return (
    <div className="layout">
      <header className="app-header no-print">
        <div className="header-row">
          <div className="brand"><span className="brand-icon"><Bolt size={18} /></span>{t('app.name')}</div>
          <div className="header-actions">
            <span className="user-chip">{user?.name}</span>
            <LangToggle />
            <button className="btn btn-ghost btn-sm" onClick={logout}>{t('auth.signOut')}</button>
          </div>
        </div>
        <nav className="nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={'end' in l ? l.end : false} className={({ isActive }) => (isActive ? 'active' : '')}>
              {({ isActive }) => (
                <>
                  {l.label}
                  {isActive && <motion.span layoutId="nav-underline" className="nav-underline" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="app-main">
        <AnimatePresence mode="wait" initial={false}>
          <PageTransition key={location.pathname}>{outlet}</PageTransition>
        </AnimatePresence>
      </main>
    </div>
  );
}
