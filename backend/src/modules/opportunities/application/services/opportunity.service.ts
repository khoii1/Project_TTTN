import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  CreateOpportunityDto,
  UpdateOpportunityDto,
  ChangeOpportunityStageDto,
  OpportunityResponseDto,
} from '../dto/opportunity.dto';
import { calculatePagination, calculateMeta } from '../../../../common/pagination/pagination.utils';
import { PaginatedResponse } from '../../../../common/types/response.types';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { AuditLogService, AuditAction } from '../../../../infrastructure/audit/audit-log.service';

@Injectable()
export class OpportunityService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async create(
    organizationId: string,
    ownerId: string,
    dto: CreateOpportunityDto
  ): Promise<OpportunityResponseDto> {
    // Verify account exists
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

    const opportunity = await this.prisma.opportunity.create({
      data: {
        id: randomUUID(),
        organizationId,
        ownerId,
        accountId: dto.accountId,
        contactId: dto.contactId,
        name: dto.name,
        stage: 'QUALIFY',
        amount: dto.amount ? new Prisma.Decimal(dto.amount) : null,
        closeDate: dto.closeDate ? new Date(dto.closeDate) : null,
        nextStep: dto.nextStep,
        description: dto.description,
      },
    });

    await this.auditLog.log({
      organizationId,
      userId: ownerId,
      action: AuditAction.CREATE,
      entityType: 'Opportunity',
      entityId: opportunity.id,
      newValues: { name: dto.name, stage: 'QUALIFY', accountId: dto.accountId },
    });

    return this.mapToResponseDto(opportunity);
  }

  async findById(opportunityId: string, organizationId: string): Promise<OpportunityResponseDto> {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: {
        id: opportunityId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    return this.mapToResponseDto(opportunity);
  }

  async findAll(
    organizationId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    stage?: string
  ): Promise<PaginatedResponse<OpportunityResponseDto>> {
    const { skip } = calculatePagination({ page, limit });

    const where: any = {
      organizationId,
      deletedAt: null,
    };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (stage) {
      where.stage = stage;
    }

    const [opportunities, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.opportunity.count({ where }),
    ]);

    return {
      data: opportunities.map((opp) => this.mapToResponseDto(opp)),
      meta: calculateMeta(page, limit, total),
    };
  }

  async update(
    opportunityId: string,
    organizationId: string,
    dto: UpdateOpportunityDto
  ): Promise<OpportunityResponseDto> {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: {
        id: opportunityId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    const updatedOpportunity = await this.prisma.opportunity.update({
      where: { id: opportunityId },
      data: {
        name: dto.name || opportunity.name,
        amount: dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : opportunity.amount,
        closeDate: dto.closeDate !== undefined ? new Date(dto.closeDate) : opportunity.closeDate,
        nextStep: dto.nextStep !== undefined ? dto.nextStep : opportunity.nextStep,
        description: dto.description !== undefined ? dto.description : opportunity.description,
      },
    });

    await this.auditLog.log({
      organizationId,
      userId: opportunity.ownerId,
      action: AuditAction.UPDATE,
      entityType: 'Opportunity',
      entityId: opportunityId,
      oldValues: { name: opportunity.name, amount: opportunity.amount?.toString() },
      newValues: dto,
    });

    return this.mapToResponseDto(updatedOpportunity);
  }

  async changeStage(
    opportunityId: string,
    organizationId: string,
    dto: ChangeOpportunityStageDto
  ): Promise<OpportunityResponseDto> {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: {
        id: opportunityId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    const updatedOpportunity = await this.prisma.opportunity.update({
      where: { id: opportunityId },
      data: { stage: dto.stage },
    });

    await this.auditLog.log({
      organizationId,
      userId: opportunity.ownerId,
      action: AuditAction.STAGE_CHANGE,
      entityType: 'Opportunity',
      entityId: opportunityId,
      oldValues: { stage: opportunity.stage },
      newValues: { stage: dto.stage },
    });

    return this.mapToResponseDto(updatedOpportunity);
  }

  async delete(opportunityId: string, organizationId: string): Promise<void> {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: {
        id: opportunityId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    // Soft delete
    await this.prisma.opportunity.update({
      where: { id: opportunityId },
      data: { deletedAt: new Date() },
    });

    await this.auditLog.log({
      organizationId,
      userId: opportunity.ownerId,
      action: AuditAction.SOFT_DELETE,
      entityType: 'Opportunity',
      entityId: opportunityId,
      oldValues: { name: opportunity.name, stage: opportunity.stage },
    });
  }

  private mapToResponseDto(opportunity: any): OpportunityResponseDto {
    return {
      id: opportunity.id,
      name: opportunity.name,
      stage: opportunity.stage,
      amount: opportunity.amount ? parseFloat(opportunity.amount.toString()) : undefined,
      closeDate: opportunity.closeDate,
      nextStep: opportunity.nextStep,
      description: opportunity.description,
      accountId: opportunity.accountId,
      contactId: opportunity.contactId,
      ownerId: opportunity.ownerId,
      organizationId: opportunity.organizationId,
      createdAt: opportunity.createdAt,
      updatedAt: opportunity.updatedAt,
    };
  }
}
