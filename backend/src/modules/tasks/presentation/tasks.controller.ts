import {
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
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { TaskService } from '../application/services/task.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  CompleteTaskDto,
  TaskResponseDto,
} from '../application/dto/task.dto';
import { JwtGuard } from '../../../shared/guards/jwt.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TokenPayload } from '../../../infrastructure/security/token.service';
import { PaginatedResponse } from '../../../common/types/response.types';
import { ImportCsvResult } from '../../../common/import-csv/import-csv.types';
import { assertCsvFile, CSV_MAX_FILE_SIZE_BYTES } from '../../../common/import-csv/import-csv.utils';

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private taskService: TaskService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created', type: TaskResponseDto })
  async create(
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: TokenPayload
  ): Promise<TaskResponseDto> {
    return this.taskService.create(user.organizationId, user.sub, dto);
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
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiResponse({ status: 200, description: 'Task details', type: TaskResponseDto })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<TaskResponseDto> {
    return this.taskService.findById(id, user.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  @ApiResponse({ status: 200, description: 'Task updated', type: TaskResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: TokenPayload
  ): Promise<TaskResponseDto> {
    return this.taskService.update(id, user.organizationId, dto);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Complete task or change status' })
  @ApiResponse({ status: 200, description: 'Task status updated', type: TaskResponseDto })
  async completeTask(
    @Param('id') id: string,
    @Body() dto: CompleteTaskDto,
    @CurrentUser() user: TokenPayload
  ): Promise<TaskResponseDto> {
    return this.taskService.completeTask(id, user.organizationId, user.sub, dto);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted task' })
  @ApiResponse({ status: 200, description: 'Task restored', type: TaskResponseDto })
  async restore(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<TaskResponseDto> {
    return this.taskService.restore(id, user.organizationId, user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task' })
  @ApiResponse({ status: 200, description: 'Task deleted' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<{ message: string }> {
    await this.taskService.delete(id, user.organizationId, user.sub);
    return { message: 'Task deleted successfully' };
  }
}
