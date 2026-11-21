// DM-016 User model (collection users): e-mail + scrypt hash; passwordHash never serialized
import mongoose, { Schema } from 'mongoose';
import type { InferSchemaType, Model } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, maxlength: 254, lowercase: true, trim: true },
    name: { type: String, required: true, maxlength: 120 },
    passwordHash: { type: String, required: true, maxlength: 200 },
    createdAt: { type: Date, required: true },
  },
  {
    collection: 'users',
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret._id;
        delete ret.passwordHash;
        return ret;
      },
    },
  },
);

userSchema.index({ email: 1 }, { unique: true });

export type User = InferSchemaType<typeof userSchema>;

export const UserModel =
  (mongoose.models.User as Model<User> | undefined) ?? mongoose.model<User>('User', userSchema);
