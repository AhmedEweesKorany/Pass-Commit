import { VaultService, CreateVaultEntryDto, UpdateVaultEntryDto } from './vault.service';
import { VaultEntry } from './vault-entry.schema';
interface AuthenticatedRequest {
    user: {
        _id: {
            toString(): string;
        };
    };
}
export declare class VaultController {
    private readonly vaultService;
    constructor(vaultService: VaultService);
    create(req: AuthenticatedRequest, createDto: CreateVaultEntryDto): Promise<VaultEntry>;
    findAll(req: AuthenticatedRequest): Promise<VaultEntry[]>;
    findByDomain(req: AuthenticatedRequest, domain: string): Promise<VaultEntry[]>;
    findOne(req: AuthenticatedRequest, id: string): Promise<VaultEntry | null>;
    update(req: AuthenticatedRequest, id: string, updateDto: UpdateVaultEntryDto): Promise<VaultEntry | null>;
    delete(req: AuthenticatedRequest, id: string): Promise<void>;
    bulkCreate(req: AuthenticatedRequest, entries: CreateVaultEntryDto[]): Promise<VaultEntry[]>;
    deleteAll(req: AuthenticatedRequest): Promise<void>;
}
export {};
