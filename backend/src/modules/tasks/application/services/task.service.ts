import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { CreateTaskDto, UpdateTaskDto, CompleteTaskDto, TaskResponseDto } from '../dto/task.dto';
import { calculatePagination, calculateMeta } from '../../../../common/pagination/pagination.utils';
import { PaginatedResponse } from '../../../../common/types/response.types';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuditLogService, AuditAction } from '../../../../infrastructure/audit/audit-log.service';
import { ImportCsvResult } from '../../../../common/import-csv/import-csv.types';
import {
  addImportError,
  buildEmptyImportResult,
  compactString,
  enumValues,
  hasSystemFields,
  isValidEmail,
  normalizeEnumValue,
  parseCsvBuffer,
  parseOptionalDate,
  pickAllowedFields,
  taskPriorityLabels,
  taskStatusLabels,
} from '../../../../common/import-csv/import-csv.utils';

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

  async importCsv(
    organizationId: string,
    ownerId: string,
    buffer: Buffer
  ): Promise<ImportCsvResult> {
    const rows = parseCsvBuffer(buffer);
    const result = buildEmptyImportResult(rows.length);
    const allowedFields = [
      'subject',
      'description',
      'dueDate',
      'priority',
      'status',
      'relatedType',
      'relatedName',
      'relatedId',
      'assigneeEmail',
    ];

    for (const row of rows) {
      const systemField = hasSystemFields(row.values);
      if (systemField && systemField !== 'relatedId') {
        addImportError(
          result,
          row.rowNumber,
          systemField,
          `Khong duoc import field he thong "${systemField}".`,
        );
        continue;
      }

      const data = pickAllowedFields(row.values, allowedFields);
      const subject = compactString(data.subject);
      if (!subject) {
        addImportError(result, row.rowNumber, 'subject', 'Tieu de la bat buoc.');
        continue;
      }

      const dueDate = parseOptionalDate(data.dueDate);
      if (data.dueDate && !dueDate) {
        addImportError(result, row.rowNumber, 'dueDate', 'dueDate khong hop le.');
        continue;
      }

      const parsedPriority = normalizeEnumValue(data.priority, TaskPriority, taskPriorityLabels);
      if (data.priority && !parsedPriority) {
        addImportError(
          result,
          row.rowNumber,
          'priority',
          `Muc uu tien khong hop le. Gia tri hop le: ${enumValues(TaskPriority)}.`,
        );
        continue;
      }

      const parsedStatus = normalizeEnumValue(data.status, TaskStatus, taskStatusLabels);
      if (data.status && !parsedStatus) {
        addImportError(
          result,
          row.rowNumber,
          'status',
          `Trang thai khong hop le. Gia tri hop le: ${enumValues(TaskStatus)}.`,
        );
        continue;
      }

      const assigneeResult = await this.resolveAssigneeId(
        organizationId,
        ownerId,
        compactString(data.assigneeEmail),
      );
      if (assigneeResult.error) {
        addImportError(result, row.rowNumber, assigneeResult.field, assigneeResult.error);
        continue;
      }

      const relatedResult = await this.resolveRelatedId(
        organizationId,
        compactString(data.relatedType),
        compactString(data.relatedId),
        compactString(data.relatedName),
      );
      if (relatedResult.error) {
        addImportError(result, row.rowNumber, relatedResult.field, relatedResult.error);
        continue;
      }

      try {
        const task = await this.prisma.task.create({
          data: {
            id: randomUUID(),
            organizationId,
            ownerId,
            assignedToId: assigneeResult.assignedToId!,
            subject,
            dueDate: dueDate || null,
            status: parsedStatus || TaskStatus.NOT_STARTED,
            priority: parsedPriority || TaskPriority.NORMAL,
            relatedType: relatedResult.relatedType,
            relatedId: relatedResult.relatedId,
            description: compactString(data.description),
          },
        });

        await this.auditLog.log({
          organizationId,
          userId: ownerId,
          action: AuditAction.CREATE,
          entityType: 'Task',
          entityId: task.id,
          newValues: { subject: task.subject, assignedToId: task.assignedToId },
        });

        result.successCount += 1;
      } catch {
        addImportError(result, row.rowNumber, undefined, 'Khong the import dong nay.');
      }
    }

    return result;
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
    relatedType?: string,
    relatedId?: string,
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

    if (relatedType) {
      where.relatedType = relatedType;
    }

    if (relatedId) {
      where.relatedId = relatedId;
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

  async restore(
    taskId: string,
    organizationId: string,
    restoredById: string
  ): Promise<TaskResponseDto> {
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
      data: {
        deletedAt: null,
        restoredAt: new Date(),
        restoredById,
      },
    });

    await this.auditLog.log({
      organizationId,
      userId: restoredById,
      action: AuditAction.RESTORE,
      entityType: 'Task',
      entityId: taskId,
      oldValues: { deletedAt: task.deletedAt },
      newValues: {
        deletedAt: null,
        restoredAt: restoredTask.restoredAt,
        restoredById,
      },
    });

    return this.mapToResponseDto(restoredTask);
  }

  async completeTask(
    taskId: string,
    organizationId: string,
    completedById: string,
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
        completedAt:
          dto.status === TaskStatus.COMPLETED
            ? task.completedAt || new Date()
            : null,
        completedById:
          dto.status === TaskStatus.COMPLETED
            ? task.completedById || completedById
            : null,
      },
    });

    await this.auditLog.log({
      organizationId,
      userId: completedById,
      action: AuditAction.TASK_COMPLETION,
      entityType: 'Task',
      entityId: taskId,
      oldValues: { status: task.status, completedAt: task.completedAt, completedById: task.completedById },
      newValues: {
        status: dto.status,
        completedAt: updatedTask.completedAt,
        completedById: updatedTask.completedById,
      },
    });

    return this.mapToResponseDto(updatedTask);
  }

  async delete(taskId: string, organizationId: string, deletedById: string): Promise<void> {
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
    const deletedAt = new Date();
    await this.prisma.task.update({
      where: { id: taskId },
      data: { deletedAt, deletedById },
    });

    await this.auditLog.log({
      organizationId,
      userId: deletedById,
      action: AuditAction.SOFT_DELETE,
      entityType: 'Task',
      entityId: taskId,
      oldValues: { subject: task.subject },
      newValues: { deletedAt, deletedById },
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
      completedById: task.completedById,
      ownerId: task.ownerId,
      assignedToId: task.assignedToId,
      organizationId: task.organizationId,
      deletedAt: task.deletedAt,
      deletedById: task.deletedById,
      restoredAt: task.restoredAt,
      restoredById: task.restoredById,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  private async resolveAssigneeId(
    organizationId: string,
    ownerId: string,
    assigneeEmail?: string,
  ): Promise<{ assignedToId?: string; field?: string; error?: string }> {
    if (!assigneeEmail) {
      return { assignedToId: ownerId };
    }

    if (!isValidEmail(assigneeEmail)) {
      return { field: 'assigneeEmail', error: 'Email nguoi duoc giao khong hop le.' };
    }

    const assignee = await this.prisma.user.findFirst({
      where: { organizationId, deletedAt: null, email: assigneeEmail },
    });

    return assignee
      ? { assignedToId: assignee.id }
      : { field: 'assigneeEmail', error: 'Khong tim thay user trong cung to chuc.' };
  }

  private async resolveRelatedId(
    organizationId: string,
    relatedType?: string,
    relatedId?: string,
    relatedName?: string,
  ): Promise<{ relatedType?: string; relatedId?: string; field?: string; error?: string }> {
    if (!relatedType && !relatedId && !relatedName) {
      return {};
    }

    const normalizedType = relatedType?.toUpperCase();
    const allowedTypes = ['LEAD', 'ACCOUNT', 'CONTACT', 'OPPORTUNITY', 'CASE'];
    if (!normalizedType || !allowedTypes.includes(normalizedType)) {
      return { field: 'relatedType', error: `relatedType hop le: ${allowedTypes.join(', ')}.` };
    }

    if (relatedId) {
      const exists = await this.findRelatedById(organizationId, normalizedType, relatedId);
      return exists
        ? { relatedType: normalizedType, relatedId }
        : { field: 'relatedId', error: 'Khong tim thay ban ghi lien quan trong cung to chuc.' };
    }

    if (!relatedName) {
      return { field: 'relatedName', error: 'relatedName hoac relatedId la bat buoc khi co relatedType.' };
    }

    const matches = await this.findRelatedByName(organizationId, normalizedType, relatedName);
    if (matches.length === 0) {
      return { field: 'relatedName', error: 'Khong tim thay ban ghi lien quan trong cung to chuc.' };
    }

    if (matches.length > 1) {
      return {
        field: 'relatedName',
        error: 'Tim thay nhieu ban ghi trung, vui long dung ID hoac du lieu cu the hon.',
      };
    }

    return { relatedType: normalizedType, relatedId: matches[0].id };
  }

  private findRelatedById(organizationId: string, relatedType: string, id: string): Promise<any> {
    const where = { id, organizationId, deletedAt: null };
    switch (relatedType) {
      case 'LEAD':
        return this.prisma.lead.findFirst({ where });
      case 'ACCOUNT':
        return this.prisma.account.findFirst({ where });
      case 'CONTACT':
        return this.prisma.contact.findFirst({ where });
      case 'OPPORTUNITY':
        return this.prisma.opportunity.findFirst({ where });
      case 'CASE':
        return this.prisma.case.findFirst({ where });
      default:
        return Promise.resolve(null);
    }
  }

  private findRelatedByName(
    organizationId: string,
    relatedType: string,
    relatedName: string,
  ): Promise<any[]> {
    const baseWhere = { organizationId, deletedAt: null };
    switch (relatedType) {
      case 'LEAD':
        return this.prisma.lead.findMany({
          where: {
            ...baseWhere,
            OR: [
              { company: { equals: relatedName, mode: 'insensitive' } },
              { lastName: { equals: relatedName, mode: 'insensitive' } },
              { email: { equals: relatedName, mode: 'insensitive' } },
            ],
          },
          take: 2,
        });
      case 'ACCOUNT':
        return this.prisma.account.findMany({
          where: { ...baseWhere, name: { equals: relatedName, mode: 'insensitive' } },
          take: 2,
        });
      case 'CONTACT':
        return this.prisma.contact.findMany({
          where: {
            ...baseWhere,
            OR: [
              { email: { equals: relatedName, mode: 'insensitive' } },
              { lastName: { equals: relatedName, mode: 'insensitive' } },
            ],
          },
          take: 2,
        });
      case 'OPPORTUNITY':
        return this.prisma.opportunity.findMany({
          where: { ...baseWhere, name: { equals: relatedName, mode: 'insensitive' } },
          take: 2,
        });
      case 'CASE':
        return this.prisma.case.findMany({
          where: { ...baseWhere, subject: { equals: relatedName, mode: 'insensitive' } },
          take: 2,
        });
      default:
        return Promise.resolve([]);
    }
  }
}
