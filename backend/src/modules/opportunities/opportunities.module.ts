import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { OpportunitiesController } from './presentation/opportunities.controller';
import { OpportunityService } from './application/services/opportunity.service';
import { OpportunityAttachmentService } from './application/services/opportunity-attachment.service';
import { OpportunitySalesService } from './application/services/opportunity-sales.service';
import { StorageService } from '../../shared/storage/storage.service';

@Module({
  imports: [PrismaModule],
  controllers: [OpportunitiesController],
  providers: [
    OpportunityService,
    OpportunityAttachmentService,
    OpportunitySalesService,
    StorageService,
  ],
  exports: [OpportunityService],
})
export class OpportunitiesModule {}
