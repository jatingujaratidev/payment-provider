import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './jwt-payload.interface';
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}
  async register(
    email: string,
    password: string,
  ): Promise<{
    userId: string;
    email: string;
  }> {
    const user = await this.usersService.createUser(email, password);
    return { userId: user.id, email: user.email };
  }
  async login(
    email: string,
    password: string,
  ): Promise<{
    access_token: string;
    expires_in: number;
  }> {
    const user = await this.usersService.validateCredentials(email, password);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const jwt = this.config.getOrThrow<{
      secret: string;
      expiresIn: string;
    }>('jwt');
    const expiresIn = this.parseExpiryToSeconds(jwt.expiresIn);
    const access_token = await this.jwtService.signAsync(payload, {
      secret: jwt.secret,
      expiresIn,
    });
    return { access_token, expires_in: expiresIn };
  }
  private parseExpiryToSeconds(expiry: string): number {
    const match = /^(\d+)([smhd])$/.exec(expiry.trim());
    if (!match) {
      return 900;
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };
    return value * (multipliers[unit] ?? 60);
  }
}
