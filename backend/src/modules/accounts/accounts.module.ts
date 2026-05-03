import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { AccountsController } from './presentation/accounts.controller';
import { AccountService } from './application/services/account.service';

@Module({
  imports: [PrismaModule],
  controllers: [AccountsController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountsModule {}
