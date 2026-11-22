// DM-017 Account model (collection accounts): farm account, members in DM-018, saved parcels (T-098 API-022)
import mongoose, { Schema } from 'mongoose';
import type { InferSchemaType, Model } from 'mongoose';

const accountSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 120 },
    createdAt: { type: Date, required: true },
    // T-098: parcels added to "Moje działki" without an analysis (unique, max 200)
    savedParcelIds: { type: [String], required: false, default: undefined },
  },
  {
    collection: 'accounts',
    timestamps: { createdAt: true, updatedAt: false },
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

export type Account = InferSchemaType<typeof accountSchema>;

export const AccountModel =
  (mongoose.models.Account as Model<Account> | undefined) ??
  mongoose.model<Account>('Account', accountSchema);
