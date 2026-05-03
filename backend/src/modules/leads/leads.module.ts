import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { LeadsController } from './presentation/leads.controller';
import { LeadService } from './application/services/lead.service';

@Module({
  imports: [PrismaModule],
  controllers: [LeadsController],
  providers: [LeadService],
  exports: [LeadService],
})
export class LeadsModule {}
