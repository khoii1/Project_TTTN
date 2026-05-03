import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { OpportunitiesController } from './presentation/opportunities.controller';
import { OpportunityService } from './application/services/opportunity.service';

@Module({
  imports: [PrismaModule],
  controllers: [OpportunitiesController],
  providers: [OpportunityService],
  exports: [OpportunityService],
})
export class OpportunitiesModule {}
