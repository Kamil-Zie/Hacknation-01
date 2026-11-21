// T-018 API-005 GET /analyses/:id: saved Report (DM-001) read from the database, no recomputation
import mongoose from 'mongoose';

import { ReportModel } from '@/models/Report.model';
import { AppError } from '@/utils/AppError';

// toJSON maps _id to string id; res.json serializes Date fields to ISO strings.
export type ReportDto = Record<string, unknown> & { id: string };

export async function getReportById(id: string): Promise<ReportDto> {
  // Without a connection Mongoose would buffer the query for 10 s; fail fast instead.
  if (mongoose.connection.readyState !== 1) {
    throw new AppError('DB_UNAVAILABLE', 'Baza danych jest niedostępna', 503);
  }
  const report = await ReportModel.findById(id);
  if (!report) {
    throw new AppError('REPORT_NOT_FOUND', 'Nie znaleziono raportu', 404);
  }
  return report.toJSON() as unknown as ReportDto;
}
