import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // read PORT from the shared root .env so the proxy always matches the API
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '');
  const target = `http://localhost:${env.PORT || 5000}`;
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: { '/api': target, '/uploads': target },
    },
  };
});
