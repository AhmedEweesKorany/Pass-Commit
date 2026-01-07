"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const vault_service_1 = require("./vault.service");
const vault_entry_schema_1 = require("./vault-entry.schema");
describe('VaultService', () => {
    let service;
    let model;
    const mockUserId = new mongoose_2.Types.ObjectId().toString();
    const mockEntryId = new mongoose_2.Types.ObjectId().toString();
    const mockVaultEntry = {
        _id: new mongoose_2.Types.ObjectId(mockEntryId),
        userId: new mongoose_2.Types.ObjectId(mockUserId),
        domain: 'example.com',
        username: 'testuser',
        encryptedPassword: {
            ciphertext: 'encrypted-password',
            iv: 'random-iv',
            salt: 'random-salt',
        },
        notes: 'Test notes',
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    const mockVaultModel = {
        create: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        findOneAndUpdate: jest.fn(),
        deleteOne: jest.fn(),
        deleteMany: jest.fn(),
        insertMany: jest.fn(),
    };
    const MockVaultModelConstructor = function (data) {
        return {
            ...data,
            _id: new mongoose_2.Types.ObjectId(),
            save: jest.fn().mockResolvedValue({ ...mockVaultEntry, ...data }),
        };
    };
    Object.assign(MockVaultModelConstructor, mockVaultModel);
    beforeEach(async () => {
        jest.clearAllMocks();
        const module = await testing_1.Test.createTestingModule({
            providers: [
                vault_service_1.VaultService,
                {
                    provide: (0, mongoose_1.getModelToken)(vault_entry_schema_1.VaultEntry.name),
                    useValue: MockVaultModelConstructor,
                },
            ],
        }).compile();
        service = module.get(vault_service_1.VaultService);
        model = module.get((0, mongoose_1.getModelToken)(vault_entry_schema_1.VaultEntry.name));
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    describe('create', () => {
        it('should create a new vault entry', async () => {
            const createDto = {
                domain: 'example.com',
                username: 'testuser',
                encryptedPassword: {
                    ciphertext: 'encrypted',
                    iv: 'iv123',
                    salt: 'salt123',
                },
                notes: 'Test notes',
            };
            const result = await service.create(mockUserId, createDto);
            expect(result).toBeDefined();
            expect(result.domain).toBe(createDto.domain);
            expect(result.username).toBe(createDto.username);
        });
    });
    describe('findAllByUser', () => {
        it('should return all vault entries for a user', async () => {
            const mockEntries = [mockVaultEntry, { ...mockVaultEntry, domain: 'another.com' }];
            mockVaultModel.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(mockEntries),
                }),
            });
            const result = await service.findAllByUser(mockUserId);
            expect(result).toEqual(mockEntries);
            expect(mockVaultModel.find).toHaveBeenCalledWith({
                userId: expect.any(mongoose_2.Types.ObjectId),
            });
        });
        it('should return empty array if no entries found', async () => {
            mockVaultModel.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([]),
                }),
            });
            const result = await service.findAllByUser(mockUserId);
            expect(result).toEqual([]);
        });
    });
    describe('findById', () => {
        it('should return a vault entry by id', async () => {
            mockVaultModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockVaultEntry),
            });
            const result = await service.findById(mockEntryId, mockUserId);
            expect(result).toEqual(mockVaultEntry);
            expect(mockVaultModel.findOne).toHaveBeenCalledWith({
                _id: expect.any(mongoose_2.Types.ObjectId),
                userId: expect.any(mongoose_2.Types.ObjectId),
            });
        });
        it('should return null if entry not found', async () => {
            mockVaultModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });
            const result = await service.findById(mockEntryId, mockUserId);
            expect(result).toBeNull();
        });
    });
    describe('findByDomain', () => {
        it('should find entries by domain', async () => {
            const entries = [mockVaultEntry];
            mockVaultModel.find.mockReturnValue({
                exec: jest.fn().mockResolvedValue(entries),
            });
            const result = await service.findByDomain('example.com', mockUserId);
            expect(result).toEqual(entries);
            expect(mockVaultModel.find).toHaveBeenCalledWith({
                userId: expect.any(mongoose_2.Types.ObjectId),
                domain: { $regex: 'example.com', $options: 'i' },
            });
        });
        it('should normalize domain by removing www prefix', async () => {
            mockVaultModel.find.mockReturnValue({
                exec: jest.fn().mockResolvedValue([]),
            });
            await service.findByDomain('www.example.com', mockUserId);
            expect(mockVaultModel.find).toHaveBeenCalledWith({
                userId: expect.any(mongoose_2.Types.ObjectId),
                domain: { $regex: 'example.com', $options: 'i' },
            });
        });
    });
    describe('update', () => {
        it('should update a vault entry', async () => {
            const updateDto = {
                username: 'newusername',
                notes: 'Updated notes',
            };
            const updatedEntry = { ...mockVaultEntry, ...updateDto };
            mockVaultModel.findOneAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue(updatedEntry),
            });
            const result = await service.update(mockEntryId, mockUserId, updateDto);
            expect(result).toEqual(updatedEntry);
            expect(mockVaultModel.findOneAndUpdate).toHaveBeenCalledWith({
                _id: expect.any(mongoose_2.Types.ObjectId),
                userId: expect.any(mongoose_2.Types.ObjectId),
            }, expect.objectContaining({
                username: 'newusername',
                notes: 'Updated notes',
            }), { new: true });
        });
        it('should return null if entry not found', async () => {
            mockVaultModel.findOneAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });
            const result = await service.update(mockEntryId, mockUserId, { notes: 'test' });
            expect(result).toBeNull();
        });
    });
    describe('delete', () => {
        it('should delete a vault entry and return true', async () => {
            mockVaultModel.deleteOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
            });
            const result = await service.delete(mockEntryId, mockUserId);
            expect(result).toBe(true);
            expect(mockVaultModel.deleteOne).toHaveBeenCalledWith({
                _id: expect.any(mongoose_2.Types.ObjectId),
                userId: expect.any(mongoose_2.Types.ObjectId),
            });
        });
        it('should return false if entry not found', async () => {
            mockVaultModel.deleteOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
            });
            const result = await service.delete(mockEntryId, mockUserId);
            expect(result).toBe(false);
        });
    });
    describe('deleteAllByUser', () => {
        it('should delete all entries for a user', async () => {
            mockVaultModel.deleteMany.mockReturnValue({
                exec: jest.fn().mockResolvedValue({ deletedCount: 5 }),
            });
            const result = await service.deleteAllByUser(mockUserId);
            expect(result).toBe(5);
            expect(mockVaultModel.deleteMany).toHaveBeenCalledWith({
                userId: expect.any(mongoose_2.Types.ObjectId),
            });
        });
        it('should return 0 if no entries deleted', async () => {
            mockVaultModel.deleteMany.mockReturnValue({
                exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
            });
            const result = await service.deleteAllByUser(mockUserId);
            expect(result).toBe(0);
        });
    });
    describe('bulkCreate', () => {
        it('should create multiple vault entries', async () => {
            const entries = [
                {
                    domain: 'site1.com',
                    username: 'user1',
                    encryptedPassword: { ciphertext: 'enc1', iv: 'iv1', salt: 'salt1' },
                },
                {
                    domain: 'site2.com',
                    username: 'user2',
                    encryptedPassword: { ciphertext: 'enc2', iv: 'iv2', salt: 'salt2' },
                },
            ];
            const createdEntries = entries.map((e, i) => ({
                ...e,
                _id: new mongoose_2.Types.ObjectId(),
                userId: new mongoose_2.Types.ObjectId(mockUserId),
            }));
            mockVaultModel.insertMany.mockResolvedValue(createdEntries);
            const result = await service.bulkCreate(mockUserId, entries);
            expect(result).toEqual(createdEntries);
            expect(mockVaultModel.insertMany).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({ domain: 'site1.com' }),
                expect.objectContaining({ domain: 'site2.com' }),
            ]));
        });
    });
});
//# sourceMappingURL=vault.service.spec.js.map