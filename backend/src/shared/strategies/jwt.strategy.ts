import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TokenPayload } from '../../infrastructure/security/token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessTokenSecret'),
    });
  }

  validate(payload: any): TokenPayload {
    return {
      sub: payload.sub,
      email: payload.email,
      organizationId: payload.organizationId,
      role: payload.role,
    };
  }
}
