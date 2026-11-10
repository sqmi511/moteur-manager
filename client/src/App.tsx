import { useEffect, ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from './auth';
import { Role } from './types';
import Layout from './components/Layout';
import { Loading } from './components/States';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Subscribers from './pages/Subscribers';
import Billing from './pages/Billing';
import PrintPage from './pages/Print';
import SettingsPage from './pages/Settings';
import Owners from './pages/Owners';

function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

function RoleGate({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth();
  return user?.role === role ? <>{children}</> : <Navigate to="/" replace />;
}

function Home() {
  const { user } = useAuth();
  return user?.role === 'admin' ? <Navigate to="/admin/owners" replace /> : <Dashboard />;
}

export default function App() {
  const { i18n } = useTranslation();
  useEffect(() => {
    const l = i18n.language === 'ar' ? 'ar' : 'en';
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('lang', l);
  }, [i18n.language]);

  return (
    <>
      <Toaster position="top-center" containerClassName="no-print" toastOptions={{ duration: 3200 }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Protected />}>
          <Route index element={<Home />} />
          <Route path="admin/owners" element={<RoleGate role="admin"><Owners /></RoleGate>} />
          <Route path="subscribers" element={<RoleGate role="moteur"><Subscribers /></RoleGate>} />
          <Route path="billing" element={<RoleGate role="moteur"><Billing /></RoleGate>} />
          <Route path="print" element={<RoleGate role="moteur"><PrintPage /></RoleGate>} />
          <Route path="settings" element={<RoleGate role="moteur"><SettingsPage /></RoleGate>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
