// DM-018 AccountMember model (collection account_members): active membership or pending invitation
import mongoose, { Schema } from 'mongoose';
import type { InferSchemaType, Model } from 'mongoose';

const accountMemberSchema = new Schema(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: false, default: null },
    email: { type: String, required: true, maxlength: 254, lowercase: true, trim: true },
    status: { type: String, required: true, enum: ['active', 'pending'] },
    addedAt: { type: Date, required: true },
  },
  {
    collection: 'account_members',
    timestamps: false,
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

accountMemberSchema.index({ accountId: 1, email: 1 }, { unique: true });
accountMemberSchema.index({ userId: 1 });

export type AccountMember = InferSchemaType<typeof accountMemberSchema>;

export const AccountMemberModel =
  (mongoose.models.AccountMember as Model<AccountMember> | undefined) ??
  mongoose.model<AccountMember>('AccountMember', accountMemberSchema);
