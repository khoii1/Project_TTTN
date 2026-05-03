import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { OrganizationsController } from './presentation/organizations.controller';
import { OrganizationService } from './application/services/organization.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrganizationsController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationsModule {}
