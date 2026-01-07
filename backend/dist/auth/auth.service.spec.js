"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const users_service_1 = require("../users/users.service");
describe('AuthService', () => {
    let service;
    let usersService;
    let jwtService;
    const mockUser = {
        _id: { toString: () => 'user-id-123' },
        googleId: 'google-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/picture.jpg',
    };
    const mockUsersService = {
        findByGoogleId: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
    };
    const mockJwtService = {
        sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };
    const mockConfigService = {
        get: jest.fn((key) => {
            const config = {
                GOOGLE_CLIENT_ID: 'mock-google-client-id',
            };
            return config[key];
        }),
    };
    beforeEach(async () => {
        jest.clearAllMocks();
        const module = await testing_1.Test.createTestingModule({
            providers: [
                auth_service_1.AuthService,
                { provide: users_service_1.UsersService, useValue: mockUsersService },
                { provide: jwt_1.JwtService, useValue: mockJwtService },
                { provide: config_1.ConfigService, useValue: mockConfigService },
            ],
        }).compile();
        service = module.get(auth_service_1.AuthService);
        usersService = module.get(users_service_1.UsersService);
        jwtService = module.get(jwt_1.JwtService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    describe('validateAccessToken', () => {
        beforeEach(() => {
            global.fetch = jest.fn();
        });
        afterEach(() => {
            jest.restoreAllMocks();
        });
        it('should return auth result for valid access token with existing user', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    id: 'google-123',
                    email: 'test@example.com',
                    name: 'Test User',
                    picture: 'https://example.com/picture.jpg',
                }),
            });
            mockUsersService.findByGoogleId.mockResolvedValue(mockUser);
            const result = await service.validateAccessToken('valid-token');
            expect(result).toEqual({
                accessToken: 'mock-jwt-token',
                user: {
                    id: 'user-id-123',
                    email: 'test@example.com',
                    name: 'Test User',
                    picture: 'https://example.com/picture.jpg',
                },
            });
            expect(global.fetch).toHaveBeenCalledWith('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: 'Bearer valid-token' } });
            expect(mockUsersService.findByGoogleId).toHaveBeenCalledWith('google-123');
            expect(mockJwtService.sign).toHaveBeenCalledWith({
                sub: 'user-id-123',
                email: 'test@example.com',
            });
        });
        it('should create new user if not found', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    id: 'new-google-id',
                    email: 'new@example.com',
                    name: 'New User',
                    picture: 'https://example.com/new.jpg',
                }),
            });
            mockUsersService.findByGoogleId.mockResolvedValue(null);
            mockUsersService.create.mockResolvedValue({
                ...mockUser,
                googleId: 'new-google-id',
                email: 'new@example.com',
                name: 'New User',
            });
            const result = await service.validateAccessToken('valid-token');
            expect(mockUsersService.create).toHaveBeenCalledWith({
                googleId: 'new-google-id',
                email: 'new@example.com',
                name: 'New User',
                picture: 'https://example.com/new.jpg',
            });
            expect(result.accessToken).toBe('mock-jwt-token');
        });
        it('should throw UnauthorizedException for invalid access token', async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                status: 401,
            });
            await expect(service.validateAccessToken('invalid-token')).rejects.toThrow(common_1.UnauthorizedException);
        });
        it('should throw UnauthorizedException when email is not provided', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    id: 'google-123',
                    name: 'No Email User',
                }),
            });
            await expect(service.validateAccessToken('valid-token')).rejects.toThrow(common_1.UnauthorizedException);
        });
        it('should use email prefix as name if name not provided', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    id: 'google-123',
                    email: 'noname@example.com',
                }),
            });
            mockUsersService.findByGoogleId.mockResolvedValue(null);
            mockUsersService.create.mockResolvedValue({
                ...mockUser,
                name: 'noname',
            });
            await service.validateAccessToken('valid-token');
            expect(mockUsersService.create).toHaveBeenCalledWith(expect.objectContaining({
                name: 'noname',
            }));
        });
    });
    describe('validateJwtPayload', () => {
        it('should return user for valid JWT payload', async () => {
            mockUsersService.findById.mockResolvedValue(mockUser);
            const result = await service.validateJwtPayload({
                sub: 'user-id-123',
                email: 'test@example.com',
            });
            expect(result).toEqual(mockUser);
            expect(mockUsersService.findById).toHaveBeenCalledWith('user-id-123');
        });
        it('should return null for non-existent user', async () => {
            mockUsersService.findById.mockResolvedValue(null);
            const result = await service.validateJwtPayload({
                sub: 'non-existent-id',
                email: 'test@example.com',
            });
            expect(result).toBeNull();
        });
    });
});
//# sourceMappingURL=auth.service.spec.js.map