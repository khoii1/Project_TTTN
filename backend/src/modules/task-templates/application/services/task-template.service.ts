import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaskPriority } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  CreateTaskTemplateDto,
  TaskTemplateResponseDto,
  UpdateTaskTemplateDto,
} from '../dto/task-template.dto';

type TemplateWithNested = Prisma.TaskTemplateGetPayload<{
  include: {
    groups: {
      include: { items: true };
    };
  };
}>;

@Injectable()
export class TaskTemplateService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string): Promise<TaskTemplateResponseDto[]> {
    const templates = await this.prisma.taskTemplate.findMany({
      where: { organizationId },
      include: { groups: { include: { items: true }, orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ isDefault: 'desc' }, { isActive: 'desc' }, { name: 'asc' }],
    });

    return templates.map((template) => this.mapToResponse(template));
  }

  async findActive(organizationId: string): Promise<TaskTemplateResponseDto[]> {
    const templates = await this.prisma.taskTemplate.findMany({
      where: { organizationId, isActive: true },
      include: { groups: { include: { items: true }, orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    return templates.map((template) => this.mapToResponse(template));
  }

  async findById(id: string, organizationId: string): Promise<TaskTemplateResponseDto> {
    const template = await this.findTemplateOrThrow(id, organizationId);
    return this.mapToResponse(template);
  }

  async create(
    organizationId: string,
    dto: CreateTaskTemplateDto,
  ): Promise<TaskTemplateResponseDto> {
    await this.assertValidTemplate(dto);

    const template = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await this.clearDefault(tx, organizationId);
      }

      return tx.taskTemplate.create({
        data: {
          id: randomUUID(),
          organizationId,
          name: dto.name.trim(),
          description: dto.description?.trim(),
          isActive: dto.isActive ?? true,
          isDefault: dto.isDefault ?? false,
          groups: {
            create: this.buildGroupCreateData(dto.groups || []),
          },
        },
        include: { groups: { include: { items: true }, orderBy: { sortOrder: 'asc' } } },
      });
    });

    return this.mapToResponse(template);
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateTaskTemplateDto,
  ): Promise<TaskTemplateResponseDto> {
    await this.findTemplateOrThrow(id, organizationId);
    await this.assertValidTemplate(dto);

    const template = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await this.clearDefault(tx, organizationId, id);
      }

      await tx.taskTemplateItem.deleteMany({
        where: { group: { templateId: id } },
      });
      await tx.taskTemplateGroup.deleteMany({ where: { templateId: id } });

      return tx.taskTemplate.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          description: dto.description?.trim(),
          isActive: dto.isActive,
          isDefault: dto.isDefault,
          groups: {
            create: this.buildGroupCreateData(dto.groups || []),
          },
        },
        include: { groups: { include: { items: true }, orderBy: { sortOrder: 'asc' } } },
      });
    });

    return this.mapToResponse(template);
  }

  async deactivate(id: string, organizationId: string): Promise<TaskTemplateResponseDto> {
    await this.findTemplateOrThrow(id, organizationId);
    const template = await this.prisma.taskTemplate.update({
      where: { id },
      data: { isActive: false, isDefault: false },
      include: { groups: { include: { items: true }, orderBy: { sortOrder: 'asc' } } },
    });

    return this.mapToResponse(template);
  }

  async setDefault(id: string, organizationId: string): Promise<TaskTemplateResponseDto> {
    const existing = await this.findTemplateOrThrow(id, organizationId);
    if (!existing.isActive) {
      throw new BadRequestException('Không thể đặt mẫu đã tắt làm mặc định.');
    }

    const template = await this.prisma.$transaction(async (tx) => {
      await this.clearDefault(tx, organizationId, id);
      return tx.taskTemplate.update({
        where: { id },
        data: { isDefault: true },
        include: { groups: { include: { items: true }, orderBy: { sortOrder: 'asc' } } },
      });
    });

    return this.mapToResponse(template);
  }

  async findTemplateForConversion(
    organizationId: string,
    taskTemplateId?: string | null,
  ): Promise<TemplateWithNested | null> {
    const where = taskTemplateId
      ? { id: taskTemplateId, organizationId }
      : { organizationId, isDefault: true, isActive: true };

    const template = await this.prisma.taskTemplate.findFirst({
      where,
      include: {
        groups: {
          include: { items: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (taskTemplateId && !template) {
      throw new NotFoundException('Không tìm thấy mẫu công việc trong tổ chức hiện tại.');
    }

    if (taskTemplateId && template && !template.isActive) {
      throw new BadRequestException('Mẫu công việc đã tắt, không thể dùng để chuyển đổi Lead.');
    }

    return template;
  }

  private async findTemplateOrThrow(
    id: string,
    organizationId: string,
  ): Promise<TemplateWithNested> {
    const template = await this.prisma.taskTemplate.findFirst({
      where: { id, organizationId },
      include: { groups: { include: { items: true }, orderBy: { sortOrder: 'asc' } } },
    });

    if (!template) {
      throw new NotFoundException('Không tìm thấy mẫu công việc.');
    }

    return template;
  }

  private async clearDefault(
    tx: Prisma.TransactionClient,
    organizationId: string,
    excludeId?: string,
  ) {
    await tx.taskTemplate.updateMany({
      where: {
        organizationId,
        id: excludeId ? { not: excludeId } : undefined,
      },
      data: { isDefault: false },
    });
  }

  private async assertValidTemplate(dto: CreateTaskTemplateDto | UpdateTaskTemplateDto) {
    const groups = dto.groups || [];
    for (const group of groups) {
      for (const item of group.items || []) {
        if ((item.dueAfterDays ?? 0) > 365) {
          throw new BadRequestException('Hạn xử lý sau chuyển đổi không được vượt quá 365 ngày.');
        }
      }
    }
  }

  private buildGroupCreateData(groups: CreateTaskTemplateDto['groups']) {
    return (groups || []).map((group, groupIndex) => ({
      id: randomUUID(),
      name: group.name.trim(),
      description: group.description?.trim(),
      sortOrder: group.sortOrder ?? groupIndex + 1,
      items: {
        create: (group.items || []).map((item, itemIndex) => ({
          id: randomUUID(),
          title: item.title.trim(),
          description: item.description?.trim(),
          priority: item.priority || TaskPriority.NORMAL,
          dueAfterDays: item.dueAfterDays ?? 1,
          sortOrder: item.sortOrder ?? itemIndex + 1,
          isActive: item.isActive ?? true,
        })),
      },
    }));
  }

  private mapToResponse(template: TemplateWithNested): TaskTemplateResponseDto {
    const groups = [...template.groups]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description || undefined,
        sortOrder: group.sortOrder,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        items: [...group.items]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description || undefined,
            priority: item.priority,
            dueAfterDays: item.dueAfterDays,
            sortOrder: item.sortOrder,
            isActive: item.isActive,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          })),
      }));

    return {
      id: template.id,
      organizationId: template.organizationId,
      name: template.name,
      description: template.description || undefined,
      isActive: template.isActive,
      isDefault: template.isDefault,
      groups,
      groupCount: groups.length,
      itemCount: groups.reduce(
        (total, group) => total + group.items.filter((item) => item.isActive).length,
        0,
      ),
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}
