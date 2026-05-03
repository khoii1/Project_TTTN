import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './presentation/auth.controller';
import { AuthService } from './application/services/auth.service';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { PasswordHasherService } from '../../infrastructure/security/password-hasher.service';
import { TokenService } from '../../infrastructure/security/token.service';
import { JwtStrategy } from '../../shared/strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordHasherService, TokenService, JwtStrategy],
  exports: [AuthService, PasswordHasherService, TokenService],
})
export class AuthModule {}
