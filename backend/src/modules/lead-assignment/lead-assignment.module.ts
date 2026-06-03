import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { LeadAssignmentService } from './application/services/lead-assignment.service';
import { LeadAssignmentRulesController } from './presentation/lead-assignment-rules.controller';

@Module({
  imports: [PrismaModule],
  controllers: [LeadAssignmentRulesController],
  providers: [LeadAssignmentService],
  exports: [LeadAssignmentService],
})
export class LeadAssignmentModule {}
