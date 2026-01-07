import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UsersService } from './users.service';
import { User, UserDocument } from './user.schema';

describe('UsersService', () => {
  let service: UsersService;
  let model: Model<UserDocument>;

  const mockUserId = new Types.ObjectId();
  const mockGoogleId = 'google-id-123';

  const mockUser = {
    _id: mockUserId,
    googleId: mockGoogleId,
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/picture.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
    toObject: () => ({
      _id: mockUserId,
      googleId: mockGoogleId,
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/picture.jpg',
    }),
  };

  // Mock model that works as a constructor
  const mockUserModelInstance = {
    save: jest.fn(),
  };

  const MockUserModel = jest.fn().mockImplementation(() => mockUserModelInstance) as any;
  MockUserModel.findOne = jest.fn();
  MockUserModel.findById = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: MockUserModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    model = module.get<Model<UserDocument>>(getModelToken(User.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto = {
        googleId: 'new-google-id',
        email: 'new@example.com',
        name: 'New User',
        picture: 'https://example.com/new.jpg',
      };

      const createdUser = {
        _id: new Types.ObjectId(),
        ...createUserDto,
        createdAt: new Date(),
      };

      mockUserModel.create.mockResolvedValue(createdUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(createdUser);
      expect(mockUserModel.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should create user without picture', async () => {
      const createUserDto = {
        googleId: 'google-id',
        email: 'user@example.com',
        name: 'User',
      };

      const createdUser = {
        _id: new Types.ObjectId(),
        ...createUserDto,
        createdAt: new Date(),
      };

      mockUserModel.create.mockResolvedValue(createdUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(createdUser);
      expect(mockUserModel.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('findByGoogleId', () => {
    it('should find user by Google ID', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.findByGoogleId(mockGoogleId);

      expect(result).toEqual(mockUser);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ googleId: mockGoogleId });
    });

    it('should return null if user not found by Google ID', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findByGoogleId('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.findById(mockUserId.toString());

      expect(result).toEqual(mockUser);
      expect(mockUserModel.findById).toHaveBeenCalledWith(mockUserId.toString());
    });

    it('should return null if user not found by ID', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });
});
