import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  UploadedFile,
  UploadedFiles,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import type { ExceptionFilter } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { TaskService } from '../application/services/task.service';
import { TaskCommentService } from '../application/services/task-comment.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  CompleteTaskDto,
  TaskResponseDto,
} from '../application/dto/task.dto';
import {
  CreateTaskCommentDto,
  TaskCommentResponseDto,
  UpdateTaskCommentDto,
} from '../application/dto/task-comment.dto';
import { JwtGuard } from '../../../shared/guards/jwt.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TokenPayload } from '../../../infrastructure/security/token.service';
import { PaginatedResponse } from '../../../common/types/response.types';
import { ImportCsvResult } from '../../../common/import-csv/import-csv.types';
import { assertCsvFile, CSV_MAX_FILE_SIZE_BYTES } from '../../../common/import-csv/import-csv.utils';
import {
  TASK_ATTACHMENT_MAX_FILE_SIZE_BYTES,
  TASK_ATTACHMENT_MAX_FILES,
} from '../../../shared/storage/storage.service';

@Catch()
class TaskCommentUploadExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status =
      typeof exception?.getStatus === 'function' ? exception.getStatus() : 500;
    const rawMessage =
      typeof exception?.message === 'string' ? exception.message : 'Upload failed';
    const path = host.switchToHttp().getRequest()?.url;

    if (exception?.code === 'LIMIT_FILE_SIZE' || rawMessage === 'File too large') {
      return response.status(413).json({
        statusCode: 413,
        message: 'File vượt quá giới hạn 5MB.',
        error: 'Payload Too Large',
        timestamp: new Date().toISOString(),
        path,
      });
    }

    if (
      exception?.code === 'LIMIT_UNEXPECTED_FILE' ||
      rawMessage === 'Unexpected field'
    ) {
      return response.status(400).json({
        statusCode: 400,
        message: `Chỉ được đính kèm tối đa ${TASK_ATTACHMENT_MAX_FILES} file cho mỗi bình luận.`,
        error: 'Bad Request',
        timestamp: new Date().toISOString(),
        path,
      });
    }

    if (exception instanceof BadRequestException) {
      const body = exception.getResponse() as any;
      return response.status(status).json({
        statusCode: status,
        message: body?.message || rawMessage,
        error: body?.error || 'Bad Request',
        timestamp: new Date().toISOString(),
        path,
      });
    }

    return response.status(status).json({
      statusCode: status,
      message: rawMessage,
      error: exception?.name || 'Error',
      timestamp: new Date().toISOString(),
      path,
    });
  }
}

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(
    private taskService: TaskService,
    private taskCommentService: TaskCommentService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created', type: TaskResponseDto })
  async create(
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: TokenPayload
  ): Promise<TaskResponseDto> {
    return this.taskService.create(user.organizationId, user.sub, dto, user);
  }

  @Post('import-csv')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: CSV_MAX_FILE_SIZE_BYTES } }))
  @ApiOperation({ summary: 'Import tasks from CSV' })
  async importCsv(
    @UploadedFile() file: any,
    @CurrentUser() user: TokenPayload
  ): Promise<ImportCsvResult> {
    const buffer = assertCsvFile(file);
    return this.taskService.importCsv(user.organizationId, user.sub, buffer);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'priority', required: false, type: String })
  @ApiQuery({ name: 'relatedType', required: false, type: String })
  @ApiQuery({ name: 'relatedId', required: false, type: String })
  @ApiQuery({ name: 'deleted', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Tasks list',
    type: () => PaginatedResponse,
  })
  async findAll(
    @CurrentUser() user: TokenPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('relatedType') relatedType?: string,
    @Query('relatedId') relatedId?: string,
    @Query('deleted') deleted?: string
  ): Promise<PaginatedResponse<TaskResponseDto>> {
    return this.taskService.findAll(
      user.organizationId,
      page || 1,
      limit || 10,
      search,
      status,
      priority,
      relatedType,
      relatedId,
      deleted === 'true',
      user,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiResponse({ status: 200, description: 'Task details', type: TaskResponseDto })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<TaskResponseDto> {
    return this.taskService.findById(id, user.organizationId, user);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get task comments and temporary attachment URLs' })
  async findComments(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<TaskCommentResponseDto[]> {
    return this.taskCommentService.findAll(id, user);
  }

  @Post(':id/comments')
  @UseFilters(TaskCommentUploadExceptionFilter)
  @UseInterceptors(
    FilesInterceptor('files', TASK_ATTACHMENT_MAX_FILES, {
      limits: { fileSize: TASK_ATTACHMENT_MAX_FILE_SIZE_BYTES },
    }),
  )
  @ApiOperation({ summary: 'Create task comment with optional attachments' })
  async createComment(
    @Param('id') id: string,
    @Body() dto: CreateTaskCommentDto,
    @UploadedFiles() files: any[] = [],
    @CurrentUser() user: TokenPayload,
  ): Promise<TaskCommentResponseDto> {
    return this.taskCommentService.create(
      id,
      user,
      dto,
      files,
    );
  }

  @Patch(':id/comments/:commentId')
  @ApiOperation({ summary: 'Update own task comment content' })
  async updateComment(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateTaskCommentDto,
    @CurrentUser() user: TokenPayload,
  ): Promise<TaskCommentResponseDto> {
    return this.taskCommentService.update(id, commentId, user, dto);
  }

  @Delete(':id/comments/:commentId')
  @ApiOperation({ summary: 'Soft delete a task comment' })
  async deleteComment(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<TaskCommentResponseDto> {
    return this.taskCommentService.delete(id, commentId, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  @ApiResponse({ status: 200, description: 'Task updated', type: TaskResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: TokenPayload
  ): Promise<TaskResponseDto> {
    return this.taskService.update(id, user.organizationId, dto, user);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Complete task or change status' })
  @ApiResponse({ status: 200, description: 'Task status updated', type: TaskResponseDto })
  async completeTask(
    @Param('id') id: string,
    @Body() dto: CompleteTaskDto,
    @CurrentUser() user: TokenPayload
  ): Promise<TaskResponseDto> {
    return this.taskService.completeTask(id, user.organizationId, user.sub, dto, user);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted task' })
  @ApiResponse({ status: 200, description: 'Task restored', type: TaskResponseDto })
  async restore(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<TaskResponseDto> {
    return this.taskService.restore(id, user.organizationId, user.sub, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task' })
  @ApiResponse({ status: 200, description: 'Task deleted' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<{ message: string }> {
    await this.taskService.delete(id, user.organizationId, user.sub, user);
    return { message: 'Task deleted successfully' };
  }
}
