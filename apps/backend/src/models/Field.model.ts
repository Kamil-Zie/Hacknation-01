// DM-024 Field model (collection fields): named set of adjacent parcels of an account (ADR-011)
import mongoose, { Schema } from 'mongoose';
import type { InferSchemaType, Model } from 'mongoose';

const parcelCopySchema = new Schema(
  {
    id: { type: String, required: true },
    parcelNumber: { type: String, required: true },
    commune: { type: String, required: true },
    region: { type: String, required: true },
    areaHa: { type: Number, required: true },
  },
  { _id: false },
);

const centroidSchema = new Schema(
  { lat: { type: Number, required: true }, lon: { type: Number, required: true } },
  { _id: false },
);

const fieldSchema = new Schema(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    name: { type: String, required: true, minlength: 1, maxlength: 120, trim: true },
    parcelIds: { type: [String], required: true },
    parcels: { type: [parcelCopySchema], required: true },
    areaHa: { type: Number, required: true },
    centroid: { type: centroidSchema, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    collection: 'fields',
    timestamps: true,
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

fieldSchema.index({ accountId: 1, createdAt: -1 });

export type Field = InferSchemaType<typeof fieldSchema>;

export const FieldModel =
  (mongoose.models.Field as Model<Field> | undefined) ??
  mongoose.model<Field>('Field', fieldSchema);
