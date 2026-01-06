import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@Request() req: any) {
    return this.usersService.findById(req.user.id);
  }

  @Post('salt')
  async updateSalt(@Request() req: any, @Body('salt') salt: string) {
    return this.usersService.updateSalt(req.user.id, salt);
  }

  @Get('salt')
  async getSalt(@Request() req: any) {
    const user = await this.usersService.findById(req.user.id);
    return { salt: user?.salt };
  }
}
