import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { TasksController } from './presentation/tasks.controller';
import { TaskService } from './application/services/task.service';
import { TaskCommentService } from './application/services/task-comment.service';
import { StorageService } from '../../shared/storage/storage.service';

@Module({
  imports: [PrismaModule],
  controllers: [TasksController],
  providers: [TaskService, TaskCommentService, StorageService],
  exports: [TaskService],
})
export class TasksModule {}
