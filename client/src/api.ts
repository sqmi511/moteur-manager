import axios from 'axios';

export const TOKEN_KEY = 'moteur_token';
export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((c) => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

api.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e.response?.status === 401 && !String(e.config?.url).includes('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(e);
  }
);

export function errMsg(e: unknown): string {
  if (axios.isAxiosError(e)) {
    if (!e.response) return 'Cannot reach the server. Is it running?';
    return e.response.data?.message || e.message;
  }
  return e instanceof Error ? e.message : 'Something went wrong';
}
