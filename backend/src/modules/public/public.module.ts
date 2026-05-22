import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { LeadCaptureService } from './application/services/lead-capture.service';
import { LeadCaptureController } from './presentation/lead-capture.controller';

@Module({
  imports: [PrismaModule],
  controllers: [LeadCaptureController],
  providers: [LeadCaptureService],
})
export class PublicModule {}
