import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtGuard } from '../../../shared/guards/jwt.guard';
import { RoleGuard } from '../../../shared/guards/role.guard';
import { TokenPayload } from '../../../infrastructure/security/token.service';
import {
  CreateTaskTemplateDto,
  TaskTemplateResponseDto,
  UpdateTaskTemplateDto,
} from '../application/dto/task-template.dto';
import { TaskTemplateService } from '../application/services/task-template.service';

@ApiTags('Task Templates')
@Controller('task-templates')
@UseGuards(JwtGuard, RoleGuard)
@ApiBearerAuth()
export class TaskTemplatesController {
  constructor(private taskTemplateService: TaskTemplateService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.SUPPORT)
  @ApiOperation({ summary: 'List task templates in current organization' })
  findAll(@CurrentUser() user: TokenPayload): Promise<TaskTemplateResponseDto[]> {
    return this.taskTemplateService.findAll(user.organizationId);
  }

  @Get('active')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.SUPPORT)
  @ApiOperation({ summary: 'List active task templates for lead conversion' })
  findActive(@CurrentUser() user: TokenPayload): Promise<TaskTemplateResponseDto[]> {
    return this.taskTemplateService.findActive(user.organizationId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.SUPPORT)
  @ApiOperation({ summary: 'Get task template by ID' })
  findById(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<TaskTemplateResponseDto> {
    return this.taskTemplateService.findById(id, user.organizationId);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create task template' })
  create(
    @Body() dto: CreateTaskTemplateDto,
    @CurrentUser() user: TokenPayload,
  ): Promise<TaskTemplateResponseDto> {
    return this.taskTemplateService.create(user.organizationId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update task template and replace groups/items' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskTemplateDto,
    @CurrentUser() user: TokenPayload,
  ): Promise<TaskTemplateResponseDto> {
    return this.taskTemplateService.update(id, user.organizationId, dto);
  }

  @Patch(':id/set-default')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Set template as default' })
  setDefault(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<TaskTemplateResponseDto> {
    return this.taskTemplateService.setDefault(id, user.organizationId);
  }

  @Delete(':id/hard')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Permanently delete an inactive task template' })
  deleteInactive(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<{ message: string }> {
    return this.taskTemplateService.deleteInactive(id, user.organizationId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate task template' })
  deactivate(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<TaskTemplateResponseDto> {
    return this.taskTemplateService.deactivate(id, user.organizationId);
  }
}
