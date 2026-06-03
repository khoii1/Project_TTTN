import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  CreateLeadAssignmentRuleDto,
  LeadAssignmentRuleResponseDto,
  UpdateLeadAssignmentRuleDto,
} from '../dto/lead-assignment-rule.dto';

@Injectable()
export class LeadAssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveOwner(params: {
    organizationId: string;
    provinceName?: string | null;
    wardName?: string | null;
    fallbackOwnerId: string;
  }): Promise<string> {
    const provinceName = this.normalizeArea(params.provinceName);
    const wardName = this.normalizeArea(params.wardName);

    if (!provinceName || !wardName) {
      return params.fallbackOwnerId;
    }

    const rule = await this.prisma.leadAssignmentRule.findFirst({
      where: {
        organizationId: params.organizationId,
        provinceName: { equals: provinceName, mode: 'insensitive' },
        wardName: { equals: wardName, mode: 'insensitive' },
        isActive: true,
        assignee: { deletedAt: null, organizationId: params.organizationId },
      },
      select: { assigneeId: true },
    });

    return rule?.assigneeId ?? params.fallbackOwnerId;
  }

  async findAll(organizationId: string): Promise<LeadAssignmentRuleResponseDto[]> {
    const rules = await this.prisma.leadAssignmentRule.findMany({
      where: { organizationId },
      include: { assignee: true },
      orderBy: [{ isActive: 'desc' }, { provinceName: 'asc' }, { wardName: 'asc' }],
    });

    return rules.map((rule) => this.mapToResponse(rule));
  }

  async findById(id: string, organizationId: string): Promise<LeadAssignmentRuleResponseDto> {
    const rule = await this.prisma.leadAssignmentRule.findFirst({
      where: { id, organizationId },
      include: { assignee: true },
    });

    if (!rule) {
      throw new NotFoundException('Không tìm thấy quy tắc phân công Lead.');
    }

    return this.mapToResponse(rule);
  }

  async create(
    organizationId: string,
    dto: CreateLeadAssignmentRuleDto,
  ): Promise<LeadAssignmentRuleResponseDto> {
    await this.assertAssigneeInOrganization(dto.assigneeId, organizationId);
    await this.assertNoDuplicateActiveRule(
      organizationId,
      dto.provinceName,
      dto.wardName,
      dto.isActive ?? true,
    );

    const rule = await this.prisma.leadAssignmentRule.create({
      data: {
        id: randomUUID(),
        organizationId,
        provinceName: dto.provinceName.trim(),
        wardName: dto.wardName.trim(),
        assigneeId: dto.assigneeId,
        isActive: dto.isActive ?? true,
      },
      include: { assignee: true },
    });

    return this.mapToResponse(rule);
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateLeadAssignmentRuleDto,
  ): Promise<LeadAssignmentRuleResponseDto> {
    const existing = await this.prisma.leadAssignmentRule.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy quy tắc phân công Lead.');
    }

    if (dto.assigneeId) {
      await this.assertAssigneeInOrganization(dto.assigneeId, organizationId);
    }

    const nextProvinceName = dto.provinceName?.trim() ?? existing.provinceName;
    const nextWardName = dto.wardName?.trim() ?? existing.wardName;
    const nextIsActive = dto.isActive ?? existing.isActive;
    await this.assertNoDuplicateActiveRule(
      organizationId,
      nextProvinceName,
      nextWardName,
      nextIsActive,
      id,
    );

    const rule = await this.prisma.leadAssignmentRule.update({
      where: { id },
      data: {
        provinceName: dto.provinceName?.trim(),
        wardName: dto.wardName?.trim(),
        assigneeId: dto.assigneeId,
        isActive: dto.isActive,
      },
      include: { assignee: true },
    });

    return this.mapToResponse(rule);
  }

  async remove(id: string, organizationId: string): Promise<LeadAssignmentRuleResponseDto> {
    const existing = await this.prisma.leadAssignmentRule.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy quy tắc phân công Lead.');
    }

    const rule = await this.prisma.leadAssignmentRule.update({
      where: { id },
      data: { isActive: false },
      include: { assignee: true },
    });

    return this.mapToResponse(rule);
  }

  getLeadVisibilityWhere(user: { sub: string; role: string }): Record<string, string> {
    return user.role === UserRole.SALES || user.role === UserRole.SUPPORT
      ? { ownerId: user.sub }
      : {};
  }

  private async assertAssigneeInOrganization(
    assigneeId: string,
    organizationId: string,
  ): Promise<void> {
    const assignee = await this.prisma.user.findFirst({
      where: { id: assigneeId, organizationId, deletedAt: null },
      select: { id: true },
    });

    if (!assignee) {
      throw new BadRequestException('Người phụ trách không thuộc tổ chức hiện tại.');
    }
  }

  private async assertNoDuplicateActiveRule(
    organizationId: string,
    provinceName: string,
    wardName: string,
    isActive: boolean,
    excludeId?: string,
  ): Promise<void> {
    if (!isActive) return;

    const duplicated = await this.prisma.leadAssignmentRule.findFirst({
      where: {
        organizationId,
        provinceName: { equals: provinceName.trim(), mode: 'insensitive' },
        wardName: { equals: wardName.trim(), mode: 'insensitive' },
        isActive: true,
        id: excludeId ? { not: excludeId } : undefined,
      },
      select: { id: true },
    });

    if (duplicated) {
      throw new BadRequestException('Phường/Xã này đã có quy tắc đang áp dụng.');
    }
  }

  private normalizeArea(value?: string | null): string | undefined {
    const trimmed = value?.trim();
    return trimmed || undefined;
  }

  private mapToResponse(rule: any): LeadAssignmentRuleResponseDto {
    return {
      id: rule.id,
      provinceName: rule.provinceName,
      wardName: rule.wardName,
      assigneeId: rule.assigneeId,
      assigneeName: [rule.assignee?.firstName, rule.assignee?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim(),
      assigneeEmail: rule.assignee?.email,
      isActive: rule.isActive,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}
