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
  };

  // Mock model instance with save method
  let mockUserModelInstance: { save: jest.Mock };

  // Create a mock constructor function
  let MockUserModel: jest.Mock & {
    findOne: jest.Mock;
    findById: jest.Mock;
  };

  beforeEach(async () => {
    // Reset mocks for each test
    mockUserModelInstance = {
      save: jest.fn(),
    };

    MockUserModel = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: new Types.ObjectId(),
      save: mockUserModelInstance.save,
    })) as any;
    MockUserModel.findOne = jest.fn();
    MockUserModel.findById = jest.fn();

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

      const savedUser = {
        _id: new Types.ObjectId(),
        ...createUserDto,
        createdAt: new Date(),
      };

      mockUserModelInstance.save.mockResolvedValue(savedUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(savedUser);
      expect(MockUserModel).toHaveBeenCalledWith(createUserDto);
      expect(mockUserModelInstance.save).toHaveBeenCalled();
    });

    it('should create user without picture', async () => {
      const createUserDto = {
        googleId: 'google-id',
        email: 'user@example.com',
        name: 'User',
      };

      const savedUser = {
        _id: new Types.ObjectId(),
        ...createUserDto,
        createdAt: new Date(),
      };

      mockUserModelInstance.save.mockResolvedValue(savedUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(savedUser);
      expect(MockUserModel).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('findByGoogleId', () => {
    it('should find user by Google ID', async () => {
      MockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.findByGoogleId(mockGoogleId);

      expect(result).toEqual(mockUser);
      expect(MockUserModel.findOne).toHaveBeenCalledWith({ googleId: mockGoogleId });
    });

    it('should return null if user not found by Google ID', async () => {
      MockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findByGoogleId('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      MockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.findById(mockUserId.toString());

      expect(result).toEqual(mockUser);
      expect(MockUserModel.findById).toHaveBeenCalledWith(mockUserId.toString());
    });

    it('should return null if user not found by ID', async () => {
      MockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });
});
