import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IsString, IsOptional, ValidateNested, IsNotEmpty, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { VaultEntry, VaultEntryDocument, EncryptedData } from './vault-entry.schema';

export class CreateVaultEntryDto {
  @IsString()
  @IsNotEmpty()
  domain!: string;

  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => EncryptedData)
  encryptedPassword!: EncryptedData;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateVaultEntryDto {
  @IsString()
  @IsOptional()
  domain?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => EncryptedData)
  encryptedPassword?: EncryptedData;

  @IsString()
  @IsOptional()
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
    console.log(`Creating vault entry for user ${userId} and domain ${createDto.domain}`);
    const entry = new this.vaultEntryModel({
      userId: new Types.ObjectId(userId),
      ...createDto,
    });
    const savedEntry = await entry.save();
    console.log('Vault entry saved with ID:', savedEntry._id);
    return savedEntry;
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
    console.log(`Updating vault entry ${id} for user ${userId}`);
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
