import { AuthService, AuthResult } from './auth.service';
declare class GoogleAuthDto {
    token: string;
}
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    googleAuth(dto: GoogleAuthDto): Promise<AuthResult>;
    verifyToken(dto: GoogleAuthDto): Promise<AuthResult>;
}
export {};
