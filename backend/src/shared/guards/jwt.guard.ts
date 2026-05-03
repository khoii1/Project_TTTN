import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokenExpiredError } from '@nestjs/jwt';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    if (info instanceof TokenExpiredError) {
      throw new UnauthorizedException('Token expired');
    }

    if (err || !user) {
      throw new UnauthorizedException('Invalid or missing token');
    }

    return user;
  }
}
