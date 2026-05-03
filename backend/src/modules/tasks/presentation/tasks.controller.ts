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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
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

  @Get()
  @ApiOperation({ summary: 'Get all tasks with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Tasks list',
    type: () => PaginatedResponse,
  })
  async findAll(
    @CurrentUser() user: TokenPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string
  ): Promise<PaginatedResponse<TaskResponseDto>> {
    return this.taskService.findAll(user.organizationId, page || 1, limit || 10, status);
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
    return this.taskService.completeTask(id, user.organizationId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task' })
  @ApiResponse({ status: 200, description: 'Task deleted' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<{ message: string }> {
    await this.taskService.delete(id, user.organizationId);
    return { message: 'Task deleted successfully' };
  }
}
