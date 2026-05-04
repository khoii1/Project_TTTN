import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { CreateTaskDto, UpdateTaskDto, CompleteTaskDto, TaskResponseDto } from '../dto/task.dto';
import { calculatePagination, calculateMeta } from '../../../../common/pagination/pagination.utils';
import { PaginatedResponse } from '../../../../common/types/response.types';
import { TaskStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuditLogService, AuditAction } from '../../../../infrastructure/audit/audit-log.service';

@Injectable()
export class TaskService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async create(
    organizationId: string,
    ownerId: string,
    dto: CreateTaskDto
  ): Promise<TaskResponseDto> {
    // Verify assigned user exists
    const assignedUser = await this.prisma.user.findFirst({
      where: {
        id: dto.assignedToId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!assignedUser) {
      throw new BadRequestException('Assigned user not found');
    }

    const task = await this.prisma.task.create({
      data: {
        id: randomUUID(),
        organizationId,
        ownerId,
        assignedToId: dto.assignedToId,
        subject: dto.subject,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        status: TaskStatus.NOT_STARTED,
        priority: dto.priority || 'NORMAL',
        relatedType: dto.relatedType,
        relatedId: dto.relatedId,
        description: dto.description,
      },
    });

    await this.auditLog.log({
      organizationId,
      userId: ownerId,
      action: AuditAction.CREATE,
      entityType: 'Task',
      entityId: task.id,
      newValues: { subject: dto.subject, assignedToId: dto.assignedToId },
    });

    return this.mapToResponseDto(task);
  }

  async findById(taskId: string, organizationId: string): Promise<TaskResponseDto> {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.mapToResponseDto(task);
  }

  async findAll(
    organizationId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string,
    priority?: string,
    deleted: boolean = false
  ): Promise<PaginatedResponse<TaskResponseDto>> {
    const { skip } = calculatePagination({ page, limit });

    const where: any = {
      organizationId,
      deletedAt: deleted ? { not: null } : null,
    };

    if (search) {
      where.subject = { contains: search, mode: 'insensitive' };
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      data: tasks.map((task) => this.mapToResponseDto(task)),
      meta: calculateMeta(page, limit, total),
    };
  }

  async update(
    taskId: string,
    organizationId: string,
    dto: UpdateTaskDto
  ): Promise<TaskResponseDto> {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Verify assigned user exists if updating
    if (dto.assignedToId && dto.assignedToId !== task.assignedToId) {
      const assignedUser = await this.prisma.user.findFirst({
        where: {
          id: dto.assignedToId,
          organizationId,
          deletedAt: null,
        },
      });

      if (!assignedUser) {
        throw new BadRequestException('Assigned user not found');
      }
    }

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        subject: dto.subject || task.subject,
        dueDate: dto.dueDate !== undefined ? new Date(dto.dueDate) : task.dueDate,
        priority: dto.priority || task.priority,
        description: dto.description !== undefined ? dto.description : task.description,
        assignedToId: dto.assignedToId || task.assignedToId,
      },
    });

    await this.auditLog.log({
      organizationId,
      userId: task.ownerId,
      action: AuditAction.UPDATE,
      entityType: 'Task',
      entityId: taskId,
      oldValues: { subject: task.subject },
      newValues: dto,
    });

    return this.mapToResponseDto(updatedTask);
  }

  async restore(taskId: string, organizationId: string): Promise<TaskResponseDto> {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (!task.deletedAt) {
      return this.mapToResponseDto(task);
    }

    const restoredTask = await this.prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: null },
    });

    await this.auditLog.log({
      organizationId,
      userId: task.ownerId,
      action: AuditAction.RESTORE,
      entityType: 'Task',
      entityId: taskId,
      oldValues: { deletedAt: task.deletedAt },
      newValues: { deletedAt: null },
    });

    return this.mapToResponseDto(restoredTask);
  }

  async completeTask(
    taskId: string,
    organizationId: string,
    dto: CompleteTaskDto
  ): Promise<TaskResponseDto> {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: dto.status,
        completedAt: dto.status === TaskStatus.COMPLETED ? new Date() : null,
      },
    });

    await this.auditLog.log({
      organizationId,
      userId: task.ownerId,
      action: AuditAction.TASK_COMPLETION,
      entityType: 'Task',
      entityId: taskId,
      oldValues: { status: task.status },
      newValues: { status: dto.status },
    });

    return this.mapToResponseDto(updatedTask);
  }

  async delete(taskId: string, organizationId: string): Promise<void> {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Soft delete
    await this.prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });

    await this.auditLog.log({
      organizationId,
      userId: task.ownerId,
      action: AuditAction.SOFT_DELETE,
      entityType: 'Task',
      entityId: taskId,
      oldValues: { subject: task.subject },
    });
  }

  private mapToResponseDto(task: any): TaskResponseDto {
    return {
      id: task.id,
      subject: task.subject,
      dueDate: task.dueDate,
      status: task.status,
      priority: task.priority,
      relatedType: task.relatedType,
      relatedId: task.relatedId,
      description: task.description,
      completedAt: task.completedAt,
      ownerId: task.ownerId,
      assignedToId: task.assignedToId,
      organizationId: task.organizationId,
      deletedAt: task.deletedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
