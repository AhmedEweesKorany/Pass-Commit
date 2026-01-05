import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService, AuthResult } from './auth.service';

class GoogleAuthDto {
  token!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleAuth(@Body() dto: GoogleAuthDto): Promise<AuthResult> {
    return this.authService.validateAccessToken(dto.token);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyToken(@Body() dto: GoogleAuthDto): Promise<AuthResult> {
    return this.authService.validateGoogleToken(dto.token);
  }
}
