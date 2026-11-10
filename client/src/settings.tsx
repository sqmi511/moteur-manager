import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api, errMsg } from './api';
import { useAuth } from './auth';
import { Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  billingModes: { perKwh: true, perAmp: true },
  pricePerKwh: 0, pricePerAmp: 0, fixedFee: 0,
  currency: 'USD', exchangeRate: 89500,
  ownerName: '', phone: '', address: '', logoPath: '', footerNote: '',
};

interface Ctx {
  settings: Settings;
  ready: boolean;
  error: string | null;
  reload: () => Promise<void>;
  setSettings: (s: Settings) => void;
}
const SettingsCtx = createContext<Ctx>(null as unknown as Ctx);
export const useSettings = () => useContext(SettingsCtx);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setError(null);
      const r = await api.get('/settings');
      setSettings({ ...DEFAULT_SETTINGS, ...r.data });
      setReady(true);
    } catch (e) {
      setError(errMsg(e));
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'moteur') reload();
    else { setSettings(DEFAULT_SETTINGS); setReady(false); }
  }, [user, reload]);

  return <SettingsCtx.Provider value={{ settings, ready, error, reload, setSettings }}>{children}</SettingsCtx.Provider>;
}
