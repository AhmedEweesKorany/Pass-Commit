import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VaultService, CreateVaultEntryDto, UpdateVaultEntryDto } from './vault.service';
import { VaultEntry, VaultEntryDocument } from './vault-entry.schema';

describe('VaultService', () => {
  let service: VaultService;
  let model: Model<VaultEntryDocument>;

  const mockUserId = new Types.ObjectId().toString();
  const mockEntryId = new Types.ObjectId().toString();

  const mockVaultEntry = {
    _id: new Types.ObjectId(mockEntryId),
    userId: new Types.ObjectId(mockUserId),
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

  // Create a mock constructor function that returns a saveable document
  const MockVaultModelConstructor = function (data: any) {
    return {
      ...data,
      _id: new Types.ObjectId(),
      save: jest.fn().mockResolvedValue({ ...mockVaultEntry, ...data }),
    };
  } as any;

  // Assign static methods
  Object.assign(MockVaultModelConstructor, mockVaultModel);

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VaultService,
        {
          provide: getModelToken(VaultEntry.name),
          useValue: MockVaultModelConstructor,
        },
      ],
    }).compile();

    service = module.get<VaultService>(VaultService);
    model = module.get<Model<VaultEntryDocument>>(getModelToken(VaultEntry.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new vault entry', async () => {
      const createDto: CreateVaultEntryDto = {
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
        userId: expect.any(Types.ObjectId),
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
        _id: expect.any(Types.ObjectId),
        userId: expect.any(Types.ObjectId),
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
        userId: expect.any(Types.ObjectId),
        domain: { $regex: 'example.com', $options: 'i' },
      });
    });

    it('should normalize domain by removing www prefix', async () => {
      mockVaultModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      await service.findByDomain('www.example.com', mockUserId);

      expect(mockVaultModel.find).toHaveBeenCalledWith({
        userId: expect.any(Types.ObjectId),
        domain: { $regex: 'example.com', $options: 'i' },
      });
    });
  });

  describe('update', () => {
    it('should update a vault entry', async () => {
      const updateDto: UpdateVaultEntryDto = {
        username: 'newusername',
        notes: 'Updated notes',
      };

      const updatedEntry = { ...mockVaultEntry, ...updateDto };
      mockVaultModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedEntry),
      });

      const result = await service.update(mockEntryId, mockUserId, updateDto);

      expect(result).toEqual(updatedEntry);
      expect(mockVaultModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: expect.any(Types.ObjectId),
          userId: expect.any(Types.ObjectId),
        },
        expect.objectContaining({
          username: 'newusername',
          notes: 'Updated notes',
        }),
        { new: true }
      );
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
        _id: expect.any(Types.ObjectId),
        userId: expect.any(Types.ObjectId),
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
        userId: expect.any(Types.ObjectId),
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
      const entries: CreateVaultEntryDto[] = [
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
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(mockUserId),
      }));

      mockVaultModel.insertMany.mockResolvedValue(createdEntries);

      const result = await service.bulkCreate(mockUserId, entries);

      expect(result).toEqual(createdEntries);
      expect(mockVaultModel.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ domain: 'site1.com' }),
          expect.objectContaining({ domain: 'site2.com' }),
        ])
      );
    });
  });
});
