import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  CreateLeadDto,
  UpdateLeadDto,
  ChangeLeadStatusDto,
  ConvertLeadDto,
  LeadConversionSuggestionsDto,
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
    dto: ConvertLeadDto = {}
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

      if (contactMode === 'USE_EXISTING' && contact.accountId !== account.id) {
        throw new BadRequestException('Selected contact does not belong to the selected account.');
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

      if (opportunityMode === 'USE_EXISTING' && opportunity?.accountId !== account.id) {
        throw new BadRequestException(
          'Selected opportunity does not belong to the selected account.',
        );
      }

      // Update Lead
      const updatedLead = await tx.lead.update({
        where: { id: leadId },
        data: {
          status: LeadStatus.CONVERTED,
          convertedAccountId: account.id,
          convertedContactId: contact.id,
          convertedOpportunityId: opportunity?.id,
          convertedAt: new Date(),
          convertedById: ownerId,
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
        convertedAt: result.convertedAt,
        convertedById: result.convertedById,
      },
    });

    return this.mapToResponseDto(result);
  }

  async getConversionSuggestions(
    leadId: string,
    organizationId: string
  ): Promise<LeadConversionSuggestionsDto> {
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

    const contactFilters: any[] = [];
    if (lead.email) {
      contactFilters.push({ email: lead.email });
    }
    if (lead.phone) {
      contactFilters.push({ phone: lead.phone });
    }
    if (lead.lastName) {
      contactFilters.push({ lastName: { contains: lead.lastName, mode: 'insensitive' } });
    }

    const [accounts, contacts, opportunities] = await Promise.all([
      this.prisma.account.findMany({
        where: {
          organizationId,
          deletedAt: null,
          name: { contains: lead.company, mode: 'insensitive' },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      contactFilters.length > 0
        ? this.prisma.contact.findMany({
            where: {
              organizationId,
              deletedAt: null,
              OR: contactFilters,
            },
            take: 5,
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
      this.prisma.opportunity.findMany({
        where: {
          organizationId,
          deletedAt: null,
          stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
          name: { contains: lead.company, mode: 'insensitive' },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      accounts: accounts.map((account) => ({
        id: account.id,
        name: account.name,
        website: account.website ?? undefined,
        phone: account.phone ?? undefined,
        ownerId: account.ownerId,
      })),
      contacts: contacts.map((contact) => ({
        id: contact.id,
        firstName: contact.firstName ?? undefined,
        lastName: contact.lastName,
        email: contact.email ?? undefined,
        phone: contact.phone ?? undefined,
        accountId: contact.accountId,
      })),
      opportunities: opportunities.map((opportunity) => ({
        id: opportunity.id,
        name: opportunity.name,
        stage: opportunity.stage,
        accountId: opportunity.accountId,
        amount: opportunity.amount ? parseFloat(opportunity.amount.toString()) : undefined,
      })),
    };
  }

  async delete(leadId: string, organizationId: string, deletedById: string): Promise<void> {
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
    const deletedAt = new Date();
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { deletedAt, deletedById },
    });

    await this.auditLog.log({
      organizationId,
      userId: deletedById,
      action: AuditAction.SOFT_DELETE,
      entityType: 'Lead',
      entityId: leadId,
      oldValues: { firstName: lead.firstName, lastName: lead.lastName, company: lead.company },
      newValues: { deletedAt, deletedById },
    });
  }

  async restore(
    leadId: string,
    organizationId: string,
    restoredById: string
  ): Promise<LeadResponseDto> {
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
      entityType: 'Lead',
      entityId: leadId,
      oldValues: { deletedAt: lead.deletedAt },
      newValues: {
        deletedAt: null,
        restoredAt: restoredLead.restoredAt,
        restoredById,
      },
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
      convertedAt: lead.convertedAt,
      convertedById: lead.convertedById,
      ownerId: lead.ownerId,
      organizationId: lead.organizationId,
      deletedAt: lead.deletedAt,
      deletedById: lead.deletedById,
      restoredAt: lead.restoredAt,
      restoredById: lead.restoredById,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    };
  }
}
