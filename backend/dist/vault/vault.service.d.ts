import { Model } from 'mongoose';
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
export declare class VaultService {
    private vaultEntryModel;
    constructor(vaultEntryModel: Model<VaultEntryDocument>);
    create(userId: string, createDto: CreateVaultEntryDto): Promise<VaultEntry>;
    findAllByUser(userId: string): Promise<VaultEntry[]>;
    findById(id: string, userId: string): Promise<VaultEntry | null>;
    findByDomain(domain: string, userId: string): Promise<VaultEntry[]>;
    update(id: string, userId: string, updateDto: UpdateVaultEntryDto): Promise<VaultEntry | null>;
    delete(id: string, userId: string): Promise<boolean>;
    deleteAllByUser(userId: string): Promise<number>;
    bulkCreate(userId: string, entries: CreateVaultEntryDto[]): Promise<VaultEntry[]>;
}
