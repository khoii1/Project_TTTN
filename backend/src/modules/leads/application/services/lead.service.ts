import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  CreateLeadDto,
  UpdateLeadDto,
  ChangeLeadStatusDto,
  ConvertLeadDto,
  LeadResponseDto,
} from '../dto/lead.dto';
import { calculatePagination, calculateMeta } from '../../../../common/pagination/pagination.utils';
import { PaginatedResponse } from '../../../../common/types/response.types';
import { LeadStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuditLogService, AuditAction } from '../../../../infrastructure/audit/audit-log.service';

@Injectable()
export class LeadService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async create(
    organizationId: string,
    ownerId: string,
    dto: CreateLeadDto
  ): Promise<LeadResponseDto> {
    const lead = await this.prisma.lead.create({
      data: {
        id: randomUUID(),
        organizationId,
        ownerId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        company: dto.company,
        title: dto.title,
        website: dto.website,
        email: dto.email,
        phone: dto.phone,
        source: dto.source,
        sourceDetail: dto.sourceDetail,
        industry: dto.industry,
        description: dto.description,
        status: LeadStatus.NEW,
      },
    });

    await this.auditLog.log({
      organizationId,
      userId: ownerId,
      action: AuditAction.CREATE,
      entityType: 'Lead',
      entityId: lead.id,
      newValues: { firstName: dto.firstName, lastName: dto.lastName, company: dto.company },
    });

    return this.mapToResponseDto(lead);
  }

  async findById(leadId: string, organizationId: string): Promise<LeadResponseDto> {
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return this.mapToResponseDto(lead);
  }

  async findAll(
    organizationId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string,
    source?: string,
    deleted: boolean = false
  ): Promise<PaginatedResponse<LeadResponseDto>> {
    const { skip } = calculatePagination({ page, limit });

    const where: any = {
      organizationId,
      deletedAt: deleted ? { not: null } : null,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (source) {
      where.source = source;
    }

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      data: leads.map((lead) => this.mapToResponseDto(lead)),
      meta: calculateMeta(page, limit, total),
    };
  }

  async update(
    leadId: string,
    organizationId: string,
    dto: UpdateLeadDto
  ): Promise<LeadResponseDto> {
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const updatedLead = await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        firstName: dto.firstName !== undefined ? dto.firstName : lead.firstName,
        lastName: dto.lastName !== undefined ? dto.lastName : lead.lastName,
        company: dto.company !== undefined ? dto.company : lead.company,
        title: dto.title !== undefined ? dto.title : lead.title,
        website: dto.website !== undefined ? dto.website : lead.website,
        email: dto.email !== undefined ? dto.email : lead.email,
        phone: dto.phone !== undefined ? dto.phone : lead.phone,
        source: dto.source !== undefined ? dto.source : lead.source,
        sourceDetail: dto.sourceDetail !== undefined ? dto.sourceDetail : lead.sourceDetail,
        industry: dto.industry !== undefined ? dto.industry : lead.industry,
        description: dto.description !== undefined ? dto.description : lead.description,
      },
    });

    await this.auditLog.log({
      organizationId,
      userId: lead.ownerId,
      action: AuditAction.UPDATE,
      entityType: 'Lead',
      entityId: leadId,
      oldValues: { firstName: lead.firstName, lastName: lead.lastName, company: lead.company },
      newValues: dto,
    });

    return this.mapToResponseDto(updatedLead);
  }

  async changeStatus(
    leadId: string,
    organizationId: string,
    dto: ChangeLeadStatusDto
  ): Promise<LeadResponseDto> {
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const updatedLead = await this.prisma.lead.update({
      where: { id: leadId },
      data: { status: dto.status },
    });

    await this.auditLog.log({
      organizationId,
      userId: lead.ownerId,
      action: AuditAction.STATUS_CHANGE,
      entityType: 'Lead',
      entityId: leadId,
      oldValues: { status: lead.status },
      newValues: { status: dto.status },
    });

    return this.mapToResponseDto(updatedLead);
  }

  async convert(
    leadId: string,
    organizationId: string,
    ownerId: string,
    dto: ConvertLeadDto
  ): Promise<LeadResponseDto> {
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (lead.status === LeadStatus.CONVERTED) {
      throw new BadRequestException('Lead is already converted');
    }

    if (dto.accountMode === 'USE_EXISTING' && !dto.accountId) {
      throw new BadRequestException('accountId is required when using an existing account');
    }

    if (dto.contactMode === 'USE_EXISTING' && !dto.contactId) {
      throw new BadRequestException('contactId is required when using an existing contact');
    }

    if (dto.opportunityMode === 'USE_EXISTING' && !dto.opportunityId) {
      throw new BadRequestException('opportunityId is required when using an existing opportunity');
    }

    // Run everything inside a transaction
    const convertedSource = lead.source || 'CONVERTED_LEAD';
    const result = await this.prisma.$transaction(async (tx) => {
      const accountMode = dto.accountMode || 'CREATE_NEW';
      const contactMode = dto.contactMode || 'CREATE_NEW';
      const opportunityMode = dto.opportunityMode || 'CREATE_NEW';

      const account =
        accountMode === 'USE_EXISTING'
          ? await tx.account.findFirst({
              where: {
                id: dto.accountId,
                organizationId,
                deletedAt: null,
              },
            })
          : await tx.account.create({
              data: {
                id: randomUUID(),
                organizationId,
                ownerId,
                name: lead.company,
                type: dto.accountType,
                website: lead.website,
                phone: lead.phone,
                source: convertedSource,
                sourceDetail: lead.sourceDetail,
              },
            });

      if (!account) {
        throw new NotFoundException('Account not found');
      }

      const contact =
        contactMode === 'USE_EXISTING'
          ? await tx.contact.findFirst({
              where: {
                id: dto.contactId,
                organizationId,
                deletedAt: null,
              },
            })
          : await tx.contact.create({
              data: {
                id: randomUUID(),
                organizationId,
                ownerId,
                accountId: account.id,
                firstName: lead.firstName,
                lastName: lead.lastName,
                title: dto.contactTitle || lead.title,
                email: lead.email,
                phone: lead.phone,
                source: convertedSource,
                sourceDetail: lead.sourceDetail,
              },
            });

      if (!contact) {
        throw new NotFoundException('Contact not found');
      }

      const opportunity =
        opportunityMode === 'DO_NOT_CREATE'
          ? null
          : opportunityMode === 'USE_EXISTING'
            ? await tx.opportunity.findFirst({
                where: {
                  id: dto.opportunityId,
                  organizationId,
                  deletedAt: null,
                },
              })
            : await tx.opportunity.create({
                data: {
                  id: randomUUID(),
                  organizationId,
                  ownerId,
                  accountId: account.id,
                  contactId: contact.id,
                  name: dto.opportunityName || `New Opportunity - ${lead.company}`,
                  stage: 'QUALIFY',
                  source: convertedSource,
                  sourceDetail: lead.sourceDetail,
                },
              });

      if (opportunityMode === 'USE_EXISTING' && !opportunity) {
        throw new NotFoundException('Opportunity not found');
      }

      // Update Lead
      const updatedLead = await tx.lead.update({
        where: { id: leadId },
        data: {
          status: LeadStatus.CONVERTED,
          convertedAccountId: account.id,
          convertedContactId: contact.id,
          convertedOpportunityId: opportunity?.id,
        },
      });

      return updatedLead;
    });

    await this.auditLog.log({
      organizationId,
      userId: ownerId,
      action: AuditAction.LEAD_CONVERSION,
      entityType: 'Lead',
      entityId: leadId,
      oldValues: { status: lead.status },
      newValues: {
        status: LeadStatus.CONVERTED,
        convertedAccountId: result.convertedAccountId,
        convertedContactId: result.convertedContactId,
        convertedOpportunityId: result.convertedOpportunityId,
      },
    });

    return this.mapToResponseDto(result);
  }

  async delete(leadId: string, organizationId: string): Promise<void> {
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Soft delete
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { deletedAt: new Date() },
    });

    await this.auditLog.log({
      organizationId,
      userId: lead.ownerId,
      action: AuditAction.SOFT_DELETE,
      entityType: 'Lead',
      entityId: leadId,
      oldValues: { firstName: lead.firstName, lastName: lead.lastName, company: lead.company },
    });
  }

  async restore(leadId: string, organizationId: string): Promise<LeadResponseDto> {
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        organizationId,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (!lead.deletedAt) {
      return this.mapToResponseDto(lead);
    }

    const restoredLead = await this.prisma.lead.update({
      where: { id: leadId },
      data: { deletedAt: null },
    });

    await this.auditLog.log({
      organizationId,
      userId: lead.ownerId,
      action: AuditAction.RESTORE,
      entityType: 'Lead',
      entityId: leadId,
      oldValues: { deletedAt: lead.deletedAt },
      newValues: { deletedAt: null },
    });

    return this.mapToResponseDto(restoredLead);
  }

  private mapToResponseDto(lead: any): LeadResponseDto {
    return {
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      company: lead.company,
      title: lead.title,
      website: lead.website,
      email: lead.email,
      phone: lead.phone,
      status: lead.status,
      source: lead.source,
      sourceDetail: lead.sourceDetail,
      industry: lead.industry,
      description: lead.description,
      convertedAccountId: lead.convertedAccountId,
      convertedContactId: lead.convertedContactId,
      convertedOpportunityId: lead.convertedOpportunityId,
      ownerId: lead.ownerId,
      organizationId: lead.organizationId,
      deletedAt: lead.deletedAt,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    };
  }
}
