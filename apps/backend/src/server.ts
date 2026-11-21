// T-001 Server start: connect to MongoDB (non-fatal) and listen
import mongoose from 'mongoose';

import { createApp } from '@/app';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

async function connectDb(): Promise<void> {
  if (!env.MONGODB_URI) {
    logger.warn('MONGODB_URI is not set, running without database');
    return;
  }
  try {
    await mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB,
      serverSelectionTimeoutMS: 8000,
    });
    logger.info(`MongoDB connected (${mongoose.connection.name})`);
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error instanceof Error ? error.message : error}`);
  }
}

createApp().listen(env.PORT, () => {
  logger.info(`API listening on :${env.PORT}/api/v1`);
});
void connectDb();
