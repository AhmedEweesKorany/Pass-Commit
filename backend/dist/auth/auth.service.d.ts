import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/user.schema';
export interface JwtPayload {
    sub: string;
    email: string;
}
export interface AuthResult {
    accessToken: string;
    user: {
        id: string;
        email: string;
        name: string;
        picture?: string;
    };
}
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly configService;
    private googleClient;
    constructor(usersService: UsersService, jwtService: JwtService, configService: ConfigService);
    validateGoogleToken(token: string): Promise<AuthResult>;
    validateAccessToken(token: string): Promise<AuthResult>;
    validateJwtPayload(payload: JwtPayload): Promise<User | null>;
}
