import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface TokenPayload {
  sub: string; // user id
  email: string;
  organizationId: string;
  role: string;
}

@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}

  generateAccessToken(payload: TokenPayload): string {
    const expiresIn = (this.configService.get<string>('jwt.accessTokenExpiration') ?? '15m') as any;
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessTokenSecret'),
      expiresIn,
    });
  }

  generateRefreshToken(payload: TokenPayload): string {
    const expiresIn = (this.configService.get<string>('jwt.refreshTokenExpiration') ?? '7d') as any;
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshTokenSecret'),
      expiresIn,
    });
  }

  verifyAccessToken(token: string): TokenPayload {
    return this.jwtService.verify(token, {
      secret: this.configService.get<string>('jwt.accessTokenSecret'),
    });
  }

  verifyRefreshToken(token: string): TokenPayload {
    return this.jwtService.verify(token, {
      secret: this.configService.get<string>('jwt.refreshTokenSecret'),
    });
  }
}
