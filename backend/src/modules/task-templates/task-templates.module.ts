import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { TaskTemplatesController } from './presentation/task-templates.controller';
import { TaskTemplateService } from './application/services/task-template.service';

@Module({
  imports: [PrismaModule],
  controllers: [TaskTemplatesController],
  providers: [TaskTemplateService],
  exports: [TaskTemplateService],
})
export class TaskTemplatesModule {}
