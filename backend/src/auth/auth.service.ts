import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.schema';

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

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  async validateGoogleToken(token: string): Promise<AuthResult> {
    try {
      // Verify the Google token
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token');
      }

      const { sub: googleId, email, name, picture } = payload;

      if (!email) {
        throw new UnauthorizedException('Email not provided by Google');
      }

      // Find or create user
      let user = await this.usersService.findByGoogleId(googleId!);

      if (!user) {
        user = await this.usersService.create({
          googleId: googleId!,
          email,
          name: name || email.split('@')[0],
          picture,
        });
      }

      // Generate JWT
      const jwtPayload: JwtPayload = {
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
    } catch (error) {
      console.error('Google token validation error:', error);
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  async validateAccessToken(token: string): Promise<AuthResult> {
    try {
      // For Chrome extension, we use the access token to get user info
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        throw new UnauthorizedException('Invalid access token');
      }

      const userInfo = await response.json();
      const { id: googleId, email, name, picture } = userInfo;

      if (!email) {
        throw new UnauthorizedException('Email not provided by Google');
      }

      // Find or create user
      let user = await this.usersService.findByGoogleId(googleId);

      if (!user) {
        user = await this.usersService.create({
          googleId,
          email,
          name: name || email.split('@')[0],
          picture,
        });
      }

      // Generate JWT
      const jwtPayload: JwtPayload = {
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
    } catch (error) {
      console.error('Access token validation error:', error);
      throw new UnauthorizedException('Invalid access token');
    }
  }

  async validateJwtPayload(payload: JwtPayload): Promise<User | null> {
    return this.usersService.findById(payload.sub);
  }
}
