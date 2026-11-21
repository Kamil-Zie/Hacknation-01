// DM-002 SourceCache model (collection source_cache): cached source responses with TTL on expiresAt
import mongoose, { Schema } from 'mongoose';
import type { InferSchemaType, Model } from 'mongoose';

const sourceCacheSchema = new Schema(
  {
    key: { type: String, required: true, maxlength: 200 },
    sourceId: {
      type: String,
      required: true,
      enum: [
        'uldk',
        'meteo',
        'sentinel2',
        'nasa_power',
        'eumetsat',
        'soilgrids',
        'elevation',
        'overpass',
      ],
    },
    payload: { type: Schema.Types.Mixed, required: true },
    dataPeriod: { type: String, required: false, maxlength: 40, default: null },
    fetchedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { collection: 'source_cache', timestamps: false, minimize: false },
);

sourceCacheSchema.index({ key: 1 }, { unique: true });
sourceCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SourceCache = InferSchemaType<typeof sourceCacheSchema>;

export const SourceCacheModel =
  (mongoose.models.SourceCache as Model<SourceCache> | undefined) ??
  mongoose.model<SourceCache>('SourceCache', sourceCacheSchema);
