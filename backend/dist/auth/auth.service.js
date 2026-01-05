"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const google_auth_library_1 = require("google-auth-library");
const users_service_1 = require("../users/users.service");
let AuthService = class AuthService {
    constructor(usersService, jwtService, configService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.googleClient = new google_auth_library_1.OAuth2Client(this.configService.get('GOOGLE_CLIENT_ID'));
    }
    async validateGoogleToken(token) {
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken: token,
                audience: this.configService.get('GOOGLE_CLIENT_ID'),
            });
            const payload = ticket.getPayload();
            if (!payload) {
                throw new common_1.UnauthorizedException('Invalid Google token');
            }
            const { sub: googleId, email, name, picture } = payload;
            if (!email) {
                throw new common_1.UnauthorizedException('Email not provided by Google');
            }
            let user = await this.usersService.findByGoogleId(googleId);
            if (!user) {
                user = await this.usersService.create({
                    googleId: googleId,
                    email,
                    name: name || email.split('@')[0],
                    picture,
                });
            }
            const jwtPayload = {
                sub: user._id.toString(),
                email: user.email,
            };
            const accessToken = this.jwtService.sign(jwtPayload);
            return {
                accessToken,
                user: {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name,
                    picture: user.picture,
                },
            };
        }
        catch (error) {
            console.error('Google token validation error:', error);
            throw new common_1.UnauthorizedException('Invalid Google token');
        }
    }
    async validateAccessToken(token) {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                throw new common_1.UnauthorizedException('Invalid access token');
            }
            const userInfo = await response.json();
            const { id: googleId, email, name, picture } = userInfo;
            if (!email) {
                throw new common_1.UnauthorizedException('Email not provided by Google');
            }
            let user = await this.usersService.findByGoogleId(googleId);
            if (!user) {
                user = await this.usersService.create({
                    googleId,
                    email,
                    name: name || email.split('@')[0],
                    picture,
                });
            }
            const jwtPayload = {
                sub: user._id.toString(),
                email: user.email,
            };
            const accessToken = this.jwtService.sign(jwtPayload);
            return {
                accessToken,
                user: {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name,
                    picture: user.picture,
                },
            };
        }
        catch (error) {
            console.error('Access token validation error:', error);
            throw new common_1.UnauthorizedException('Invalid access token');
        }
    }
    async validateJwtPayload(payload) {
        return this.usersService.findById(payload.sub);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map