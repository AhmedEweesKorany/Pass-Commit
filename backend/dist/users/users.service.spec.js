"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const users_service_1 = require("./users.service");
const user_schema_1 = require("./user.schema");
describe('UsersService', () => {
    let service;
    let model;
    const mockUserId = new mongoose_2.Types.ObjectId();
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
    let mockUserModelInstance;
    let MockUserModel;
    beforeEach(async () => {
        mockUserModelInstance = {
            save: jest.fn(),
        };
        MockUserModel = jest.fn().mockImplementation((data) => ({
            ...data,
            _id: new mongoose_2.Types.ObjectId(),
            save: mockUserModelInstance.save,
        }));
        MockUserModel.findOne = jest.fn();
        MockUserModel.findById = jest.fn();
        const module = await testing_1.Test.createTestingModule({
            providers: [
                users_service_1.UsersService,
                {
                    provide: (0, mongoose_1.getModelToken)(user_schema_1.User.name),
                    useValue: MockUserModel,
                },
            ],
        }).compile();
        service = module.get(users_service_1.UsersService);
        model = module.get((0, mongoose_1.getModelToken)(user_schema_1.User.name));
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
                _id: new mongoose_2.Types.ObjectId(),
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
                _id: new mongoose_2.Types.ObjectId(),
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
//# sourceMappingURL=users.service.spec.js.map