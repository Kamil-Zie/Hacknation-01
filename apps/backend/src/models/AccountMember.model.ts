// DM-018 AccountMember model (collection account_members): active membership or pending invitation, role tag (T-104)
import mongoose, { Schema } from 'mongoose';
import type { InferSchemaType, Model } from 'mongoose';

import { MEMBER_ROLES } from '@/models/memberRoles';

const accountMemberSchema = new Schema(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: false, default: null },
    email: { type: String, required: true, maxlength: 254, lowercase: true, trim: true },
    status: { type: String, required: true, enum: ['active', 'pending'] },
    addedAt: { type: Date, required: true },
    // T-092 DM-018: parcels this member may see; missing or null = every parcel of the account
    parcelIds: { type: [String], required: false, default: undefined },
    // T-104 missing on older rows: the creator (oldest membership) is owner, everyone else partner
    role: { type: String, enum: MEMBER_ROLES, required: false, default: undefined },
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
