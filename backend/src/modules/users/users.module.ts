import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { UsersController } from './presentation/users.controller';
import { UserService } from './application/services/user.service';
import { PasswordHasherService } from '../../infrastructure/security/password-hasher.service';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UserService, PasswordHasherService],
})
export class UsersModule {}
