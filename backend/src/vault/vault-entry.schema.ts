import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IsString, IsNotEmpty } from 'class-validator';

export type VaultEntryDocument = VaultEntry & Document;

// Encrypted data structure
export class EncryptedData {
  @IsString()
  @IsNotEmpty()
  @Prop({ required: true })
  ciphertext!: string;

  @IsString()
  @IsNotEmpty()
  @Prop({ required: true })
  iv!: string;

  @IsString()
  @IsNotEmpty()
  @Prop({ required: true })
  salt!: string;
}

@Schema({ timestamps: true })
export class VaultEntry {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  domain!: string;

  @Prop({ required: true })
  username!: string;

  // Encrypted password data (E2E encrypted client-side)
  @Prop({ type: Object, required: true })
  encryptedPassword!: EncryptedData;

  @Prop()
  notes?: string;

  @Prop()
  favicon?: string;

  @Prop({ default: Date.now })
  createdAt!: Date;

  @Prop({ default: Date.now })
  updatedAt!: Date;
}

export const VaultEntrySchema = SchemaFactory.createForClass(VaultEntry);

// Index for efficient user + domain queries
VaultEntrySchema.index({ userId: 1, domain: 1 });
