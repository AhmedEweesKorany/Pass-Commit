import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VaultEntry, VaultEntryDocument, EncryptedData } from './vault-entry.schema';

export interface CreateVaultEntryDto {
  domain: string;
  username: string;
  encryptedPassword: EncryptedData;
  notes?: string;
}

export interface UpdateVaultEntryDto {
  domain?: string;
  username?: string;
  encryptedPassword?: EncryptedData;
  notes?: string;
}

@Injectable()
export class VaultService {
  constructor(
    @InjectModel(VaultEntry.name)
    private vaultEntryModel: Model<VaultEntryDocument>,
  ) {}

  async create(
    userId: string,
    createDto: CreateVaultEntryDto,
  ): Promise<VaultEntry> {
    const entry = new this.vaultEntryModel({
      userId: new Types.ObjectId(userId),
      ...createDto,
    });
    return entry.save();
  }

  async findAllByUser(userId: string): Promise<VaultEntry[]> {
    return this.vaultEntryModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findById(id: string, userId: string): Promise<VaultEntry | null> {
    return this.vaultEntryModel
      .findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .exec();
  }

  async findByDomain(domain: string, userId: string): Promise<VaultEntry[]> {
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
    return this.vaultEntryModel
      .find({
        userId: new Types.ObjectId(userId),
        domain: { $regex: normalizedDomain, $options: 'i' },
      })
      .exec();
  }

  async update(
    id: string,
    userId: string,
    updateDto: UpdateVaultEntryDto,
  ): Promise<VaultEntry | null> {
    return this.vaultEntryModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          userId: new Types.ObjectId(userId),
        },
        { ...updateDto, updatedAt: new Date() },
        { new: true },
      )
      .exec();
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.vaultEntryModel
      .deleteOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    return result.deletedCount > 0;
  }

  async deleteAllByUser(userId: string): Promise<number> {
    const result = await this.vaultEntryModel
      .deleteMany({ userId: new Types.ObjectId(userId) })
      .exec();
    return result.deletedCount;
  }

  async bulkCreate(
    userId: string,
    entries: CreateVaultEntryDto[],
  ): Promise<VaultEntry[]> {
    const documents = entries.map((entry) => ({
      userId: new Types.ObjectId(userId),
      ...entry,
    }));
    return this.vaultEntryModel.insertMany(documents);
  }
}
