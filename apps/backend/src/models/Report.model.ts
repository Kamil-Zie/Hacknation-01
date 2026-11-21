// DM-001 Report model (collection reports): saved parcel analysis; embedded DM-003, DM-006..DM-015 as Mixed
import mongoose, { Schema } from 'mongoose';
import type { InferSchemaType, Model } from 'mongoose';

const mixed = { type: Schema.Types.Mixed, required: true };

const reportSchema = new Schema(
  {
    parcel: mixed,
    crop: {
      type: new Schema(
        { code: { type: String, required: true }, name: { type: String, required: true } },
        { _id: false },
      ),
      required: true,
    },
    analysisDate: { type: String, required: true, maxlength: 10 },
    status: { type: String, required: true, enum: ['complete', 'partial'] },
    assessment: mixed,
    vulnerability: mixed,
    causes: { type: [Schema.Types.Mixed], required: true },
    recommendations: { type: [Schema.Types.Mixed], required: true },
    sources: { type: [Schema.Types.Mixed], required: true },
    limitations: { type: [String], required: true },
    dataGaps: { type: [Schema.Types.Mixed], required: true },
    charts: { type: Schema.Types.Mixed, required: false, default: null },
    methodologyVersion: { type: String, required: true, maxlength: 20 },
    computedAt: { type: Date, required: true },
    durationMs: { type: Number, required: true },
    createdAt: { type: Date, required: true },
  },
  {
    collection: 'reports',
    timestamps: { createdAt: true, updatedAt: false },
    minimize: false,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret._id;
        return ret;
      },
    },
  },
);

reportSchema.index({ 'parcel.id': 1, analysisDate: 1, 'crop.code': 1 });
reportSchema.index({ createdAt: -1 });

export type Report = InferSchemaType<typeof reportSchema>;

export const ReportModel =
  (mongoose.models.Report as Model<Report> | undefined) ??
  mongoose.model<Report>('Report', reportSchema);
