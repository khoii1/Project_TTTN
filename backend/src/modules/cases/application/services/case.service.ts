import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  CreateCaseDto,
  UpdateCaseDto,
  ChangeCaseStatusDto,
  CaseResponseDto,
} from '../dto/case.dto';
import { calculatePagination, calculateMeta } from '../../../../common/pagination/pagination.utils';
import { PaginatedResponse } from '../../../../common/types/response.types';
import { CaseStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuditLogService, AuditAction } from '../../../../infrastructure/audit/audit-log.service';

@Injectable()
export class CaseService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async create(
    organizationId: string,
    ownerId: string,
    dto: CreateCaseDto
  ): Promise<CaseResponseDto> {
    // Verify account exists if provided
    if (dto.accountId) {
      const account = await this.prisma.account.findFirst({
        where: {
          id: dto.accountId,
          organizationId,
          deletedAt: null,
        },
      });

      if (!account) {
        throw new BadRequestException('Account not found');
      }
    }

    // Verify contact exists if provided
    if (dto.contactId) {
      const contact = await this.prisma.contact.findFirst({
        where: {
          id: dto.contactId,
          organizationId,
          deletedAt: null,
        },
      });

      if (!contact) {
        throw new BadRequestException('Contact not found');
      }
    }

    const crmCase = await this.prisma.case.create({
      data: {
        id: randomUUID(),
        organizationId,
        ownerId,
        subject: dto.subject,
        status: CaseStatus.NEW,
        priority: dto.priority || 'MEDIUM',
        source: dto.source,
        sourceDetail: dto.sourceDetail,
        description: dto.description,
        accountId: dto.accountId,
        contactId: dto.contactId,
      },
    });

    await this.auditLog.log({
      organizationId,
      userId: ownerId,
      action: AuditAction.CREATE,
      entityType: 'Case',
      entityId: crmCase.id,
      newValues: { subject: dto.subject, priority: dto.priority },
    });

    return this.mapToResponseDto(crmCase);
  }

  async findById(caseId: string, organizationId: string): Promise<CaseResponseDto> {
    const crmCase = await this.prisma.case.findFirst({
      where: {
        id: caseId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!crmCase) {
      throw new NotFoundException('Case not found');
    }

    return this.mapToResponseDto(crmCase);
  }

  async findAll(
    organizationId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string,
    priority?: string,
    source?: string,
    deleted: boolean = false
  ): Promise<PaginatedResponse<CaseResponseDto>> {
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

    if (source) {
      where.source = source;
    }

    const [cases, total] = await Promise.all([
      this.prisma.case.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.case.count({ where }),
    ]);

    return {
      data: cases.map((c) => this.mapToResponseDto(c)),
      meta: calculateMeta(page, limit, total),
    };
  }

  async update(
    caseId: string,
    organizationId: string,
    dto: UpdateCaseDto
  ): Promise<CaseResponseDto> {
    const crmCase = await this.prisma.case.findFirst({
      where: {
        id: caseId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!crmCase) {
      throw new NotFoundException('Case not found');
    }

    const updatedCase = await this.prisma.case.update({
      where: { id: caseId },
      data: {
        subject: dto.subject || crmCase.subject,
        priority: dto.priority || crmCase.priority,
        source: dto.source !== undefined ? dto.source : crmCase.source,
        sourceDetail: dto.sourceDetail !== undefined ? dto.sourceDetail : crmCase.sourceDetail,
        description: dto.description !== undefined ? dto.description : crmCase.description,
      },
    });

    await this.auditLog.log({
      organizationId,
      userId: crmCase.ownerId,
      action: AuditAction.UPDATE,
      entityType: 'Case',
      entityId: caseId,
      oldValues: { subject: crmCase.subject },
      newValues: dto,
    });

    return this.mapToResponseDto(updatedCase);
  }

  async changeStatus(
    caseId: string,
    organizationId: string,
    dto: ChangeCaseStatusDto
  ): Promise<CaseResponseDto> {
    const crmCase = await this.prisma.case.findFirst({
      where: {
        id: caseId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!crmCase) {
      throw new NotFoundException('Case not found');
    }

    const updatedCase = await this.prisma.case.update({
      where: { id: caseId },
      data: { status: dto.status },
    });

    await this.auditLog.log({
      organizationId,
      userId: crmCase.ownerId,
      action: AuditAction.STATUS_CHANGE,
      entityType: 'Case',
      entityId: caseId,
      oldValues: { status: crmCase.status },
      newValues: { status: dto.status },
    });

    return this.mapToResponseDto(updatedCase);
  }

  async delete(caseId: string, organizationId: string): Promise<void> {
    const crmCase = await this.prisma.case.findFirst({
      where: {
        id: caseId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!crmCase) {
      throw new NotFoundException('Case not found');
    }

    // Soft delete
    await this.prisma.case.update({
      where: { id: caseId },
      data: { deletedAt: new Date() },
    });

    await this.auditLog.log({
      organizationId,
      userId: crmCase.ownerId,
      action: AuditAction.SOFT_DELETE,
      entityType: 'Case',
      entityId: caseId,
      oldValues: { subject: crmCase.subject },
    });
  }

  async restore(caseId: string, organizationId: string): Promise<CaseResponseDto> {
    const crmCase = await this.prisma.case.findFirst({
      where: {
        id: caseId,
        organizationId,
      },
    });

    if (!crmCase) {
      throw new NotFoundException('Case not found');
    }

    if (!crmCase.deletedAt) {
      return this.mapToResponseDto(crmCase);
    }

    const restoredCase = await this.prisma.case.update({
      where: { id: caseId },
      data: { deletedAt: null },
    });

    await this.auditLog.log({
      organizationId,
      userId: crmCase.ownerId,
      action: AuditAction.RESTORE,
      entityType: 'Case',
      entityId: caseId,
      oldValues: { deletedAt: crmCase.deletedAt },
      newValues: { deletedAt: null },
    });

    return this.mapToResponseDto(restoredCase);
  }

  private mapToResponseDto(crmCase: any): CaseResponseDto {
    return {
      id: crmCase.id,
      subject: crmCase.subject,
      status: crmCase.status,
      priority: crmCase.priority,
      source: crmCase.source,
      sourceDetail: crmCase.sourceDetail,
      description: crmCase.description,
      accountId: crmCase.accountId,
      contactId: crmCase.contactId,
      ownerId: crmCase.ownerId,
      organizationId: crmCase.organizationId,
      deletedAt: crmCase.deletedAt,
      createdAt: crmCase.createdAt,
      updatedAt: crmCase.updatedAt,
    };
  }
}
