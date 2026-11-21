// T-041 DB guard: without a connection Mongoose buffers queries ~10 s and fails with 500; answer 503 at once
import mongoose from 'mongoose';

import { AppError } from '@/utils/AppError';

export function assertDbConnected(): void {
  if (mongoose.connection.readyState !== 1) {
    throw new AppError('DB_UNAVAILABLE', 'Baza danych jest niedostępna', 503);
  }
}
