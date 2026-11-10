import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { config } from './config';
import { errorHandler } from './errors';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import settingsRoutes from './routes/settings';
import subscriberRoutes from './routes/subscribers';
import billRoutes from './routes/bills';
import dashboardRoutes from './routes/dashboard';

const app = express();
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(config.uploadsDir));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', (_req, res) => res.status(404).json({ message: 'Not found' }));
app.use(errorHandler);

async function main() {
  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log(`MongoDB connected: ${config.mongoUri}`);
  } catch (e) {
    console.error('\n✖ Could not connect to MongoDB at', config.mongoUri);
    console.error('  Make sure the local MongoDB service (mongod) is running.\n');
    process.exit(1);
  }
  app.listen(config.port, () => console.log(`API running on http://localhost:${config.port}`));
}
main();
