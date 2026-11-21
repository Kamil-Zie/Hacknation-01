// T-001 GET /health: service status and database connection state
import mongoose from 'mongoose';

export type HealthDto = {
  status: 'ok';
  db: 'connected' | 'disconnected';
  uptimeSeconds: number;
};

export function getHealth(): HealthDto {
  return {
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptimeSeconds: Math.round(process.uptime()),
  };
}
