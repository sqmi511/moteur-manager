import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Root .env first (shared by server + client), then server/.env as a fallback.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/moteur',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  uploadsDir: path.resolve(__dirname, '../uploads'),
};

fs.mkdirSync(config.uploadsDir, { recursive: true });
