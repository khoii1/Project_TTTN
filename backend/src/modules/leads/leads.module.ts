import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { LeadAssignmentModule } from '../lead-assignment/lead-assignment.module';
import { TaskTemplatesModule } from '../task-templates/task-templates.module';
import { LeadsController } from './presentation/leads.controller';
import { LeadService } from './application/services/lead.service';

@Module({
  imports: [PrismaModule, LeadAssignmentModule, TaskTemplatesModule],
  controllers: [LeadsController],
  providers: [LeadService],
  exports: [LeadService],
})
export class LeadsModule {}
