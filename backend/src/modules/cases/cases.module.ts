import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { CasesController } from './presentation/cases.controller';
import { CaseService } from './application/services/case.service';

@Module({
  imports: [PrismaModule],
  controllers: [CasesController],
  providers: [CaseService],
  exports: [CaseService],
})
export class CasesModule {}
