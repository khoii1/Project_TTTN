import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { TasksController } from './presentation/tasks.controller';
import { TaskService } from './application/services/task.service';

@Module({
  imports: [PrismaModule],
  controllers: [TasksController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TasksModule {}
