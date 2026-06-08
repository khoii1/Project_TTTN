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
import { CasePriority, CaseStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuditLogService, AuditAction } from '../../../../infrastructure/audit/audit-log.service';
import { ImportCsvResult } from '../../../../common/import-csv/import-csv.types';
import {
  addImportError,
  buildEmptyImportResult,
  casePriorityLabels,
  caseStatusLabels,
  compactString,
  enumValues,
  hasSystemFields,
  isValidEmail,
  normalizeEnumValue,
  parseCsvBuffer,
  pickAllowedFields,
} from '../../../../common/import-csv/import-csv.utils';
import { ownerVisibilityWhere, RecordVisibilityUser } from '../../../../common/security/record-visibility';

@Injectable()
export class CaseService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService
  ) {}

  async create(
    organizationId: string,
    ownerId: string,
    dto: CreateCaseDto,
    user?: RecordVisibilityUser,
  ): Promise<CaseResponseDto> {
    // Verify account exists if provided
    if (dto.accountId) {
      const account = await this.prisma.account.findFirst({
        where: {
          id: dto.accountId,
          organizationId,
          deletedAt: null,
          ...ownerVisibilityWhere(user),
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
          ...ownerVisibilityWhere(user),
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
      'priority',
      'status',
      'source',
      'sourceDetail',
      'accountName',
      'accountId',
      'contactEmail',
      'contactId',
    ];

    for (const row of rows) {
      const systemField = hasSystemFields(row.values);
      if (systemField) {
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

      const parsedPriority = normalizeEnumValue(data.priority, CasePriority, casePriorityLabels);
      if (data.priority && !parsedPriority) {
        addImportError(
          result,
          row.rowNumber,
          'priority',
          `Muc uu tien khong hop le. Gia tri hop le: ${enumValues(CasePriority)}.`,
        );
        continue;
      }

      const parsedStatus = normalizeEnumValue(data.status, CaseStatus, caseStatusLabels);
      if (data.status && !parsedStatus) {
        addImportError(
          result,
          row.rowNumber,
          'status',
          `Trang thai khong hop le. Gia tri hop le: ${enumValues(CaseStatus)}.`,
        );
        continue;
      }

      const accountResult = await this.resolveAccountId(
        organizationId,
        compactString(data.accountId),
        compactString(data.accountName),
      );
      if (accountResult.error) {
        addImportError(result, row.rowNumber, accountResult.field, accountResult.error);
        continue;
      }

      const contactResult = await this.resolveContactId(
        organizationId,
        accountResult.accountId,
        compactString(data.contactId),
        compactString(data.contactEmail),
      );
      if (contactResult.error) {
        addImportError(result, row.rowNumber, contactResult.field, contactResult.error);
        continue;
      }

      try {
        const crmCase = await this.prisma.case.create({
          data: {
            id: randomUUID(),
            organizationId,
            ownerId,
            subject,
            status: parsedStatus || CaseStatus.NEW,
            priority: parsedPriority || CasePriority.MEDIUM,
            source: compactString(data.source) || 'IMPORT_CSV',
            sourceDetail: compactString(data.sourceDetail),
            description: compactString(data.description),
            accountId: accountResult.accountId,
            contactId: contactResult.contactId,
          },
        });

        await this.auditLog.log({
          organizationId,
          userId: ownerId,
          action: AuditAction.CREATE,
          entityType: 'Case',
          entityId: crmCase.id,
          newValues: { subject: crmCase.subject, priority: crmCase.priority },
        });

        result.successCount += 1;
      } catch {
        addImportError(result, row.rowNumber, undefined, 'Khong the import dong nay.');
      }
    }

    return result;
  }

  async findById(
    caseId: string,
    organizationId: string,
    user?: RecordVisibilityUser,
  ): Promise<CaseResponseDto> {
    const crmCase = await this.prisma.case.findFirst({
      where: {
        id: caseId,
        organizationId,
        deletedAt: null,
        ...ownerVisibilityWhere(user),
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
    deleted: boolean = false,
    accountId?: string,
    contactId?: string,
    user?: RecordVisibilityUser,
  ): Promise<PaginatedResponse<CaseResponseDto>> {
    const { skip } = calculatePagination({ page, limit });

    const where: any = {
      organizationId,
      deletedAt: deleted ? { not: null } : null,
      ...ownerVisibilityWhere(user),
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

    if (accountId) {
      where.accountId = accountId;
    }

    if (contactId) {
      where.contactId = contactId;
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
    dto: UpdateCaseDto,
    user?: RecordVisibilityUser,
  ): Promise<CaseResponseDto> {
    const crmCase = await this.prisma.case.findFirst({
      where: {
        id: caseId,
        organizationId,
        deletedAt: null,
        ...ownerVisibilityWhere(user),
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
    closedById: string,
    dto: ChangeCaseStatusDto,
    user?: RecordVisibilityUser,
  ): Promise<CaseResponseDto> {
    const crmCase = await this.prisma.case.findFirst({
      where: {
        id: caseId,
        organizationId,
        deletedAt: null,
        ...ownerVisibilityWhere(user),
      },
    });

    if (!crmCase) {
      throw new NotFoundException('Case not found');
    }

    const updatedCase = await this.prisma.case.update({
      where: { id: caseId },
      data: {
        status: dto.status,
        closedAt: dto.status === CaseStatus.CLOSED ? new Date() : null,
        closedById: dto.status === CaseStatus.CLOSED ? closedById : null,
      },
    });

    await this.auditLog.log({
      organizationId,
      userId: closedById,
      action: AuditAction.STATUS_CHANGE,
      entityType: 'Case',
      entityId: caseId,
      oldValues: {
        status: crmCase.status,
        closedAt: crmCase.closedAt,
        closedById: crmCase.closedById,
      },
      newValues: {
        status: dto.status,
        closedAt: updatedCase.closedAt,
        closedById: updatedCase.closedById,
      },
    });

    return this.mapToResponseDto(updatedCase);
  }

  async delete(
    caseId: string,
    organizationId: string,
    deletedById: string,
    user?: RecordVisibilityUser,
  ): Promise<void> {
    const crmCase = await this.prisma.case.findFirst({
      where: {
        id: caseId,
        organizationId,
        deletedAt: null,
        ...ownerVisibilityWhere(user),
      },
    });

    if (!crmCase) {
      throw new NotFoundException('Case not found');
    }

    // Soft delete
    const deletedAt = new Date();
    await this.prisma.case.update({
      where: { id: caseId },
      data: { deletedAt, deletedById },
    });

    await this.auditLog.log({
      organizationId,
      userId: deletedById,
      action: AuditAction.SOFT_DELETE,
      entityType: 'Case',
      entityId: caseId,
      oldValues: { subject: crmCase.subject },
      newValues: { deletedAt, deletedById },
    });
  }

  async restore(
    caseId: string,
    organizationId: string,
    restoredById: string,
    user?: RecordVisibilityUser,
  ): Promise<CaseResponseDto> {
    const crmCase = await this.prisma.case.findFirst({
      where: {
        id: caseId,
        organizationId,
        ...ownerVisibilityWhere(user),
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
      entityType: 'Case',
      entityId: caseId,
      oldValues: { deletedAt: crmCase.deletedAt },
      newValues: {
        deletedAt: null,
        restoredAt: restoredCase.restoredAt,
        restoredById,
      },
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
      closedAt: crmCase.closedAt,
      closedById: crmCase.closedById,
      accountId: crmCase.accountId,
      contactId: crmCase.contactId,
      ownerId: crmCase.ownerId,
      organizationId: crmCase.organizationId,
      deletedAt: crmCase.deletedAt,
      deletedById: crmCase.deletedById,
      restoredAt: crmCase.restoredAt,
      restoredById: crmCase.restoredById,
      createdAt: crmCase.createdAt,
      updatedAt: crmCase.updatedAt,
    };
  }

  private async resolveAccountId(
    organizationId: string,
    accountId?: string,
    accountName?: string,
  ): Promise<{ accountId?: string; field?: string; error?: string }> {
    if (!accountId && !accountName) {
      return {};
    }

    if (accountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: accountId, organizationId, deletedAt: null },
      });
      return account
        ? { accountId: account.id }
        : { field: 'accountId', error: 'Khong tim thay Account trong cung to chuc.' };
    }

    const accounts = await this.prisma.account.findMany({
      where: {
        organizationId,
        deletedAt: null,
        name: { equals: accountName, mode: 'insensitive' },
      },
      take: 2,
    });

    if (accounts.length === 0) {
      return { field: 'accountName', error: 'Khong tim thay Account trong cung to chuc.' };
    }

    if (accounts.length > 1) {
      return {
        field: 'accountName',
        error: 'Tim thay nhieu ban ghi trung, vui long dung ID hoac du lieu cu the hon.',
      };
    }

    return { accountId: accounts[0].id };
  }

  private async resolveContactId(
    organizationId: string,
    accountId?: string,
    contactId?: string,
    contactEmail?: string,
  ): Promise<{ contactId?: string; field?: string; error?: string }> {
    if (!contactId && !contactEmail) {
      return {};
    }

    if (contactId) {
      const contact = await this.prisma.contact.findFirst({
        where: { id: contactId, organizationId, deletedAt: null },
      });
      if (!contact) {
        return { field: 'contactId', error: 'Khong tim thay Contact trong cung to chuc.' };
      }
      if (accountId && contact.accountId !== accountId) {
        return { field: 'contactId', error: 'Contact khong thuoc Account da chon.' };
      }
      return { contactId: contact.id };
    }

    if (!isValidEmail(contactEmail)) {
      return { field: 'contactEmail', error: 'Email contact khong hop le.' };
    }

    const contacts = await this.prisma.contact.findMany({
      where: { organizationId, deletedAt: null, email: contactEmail },
      take: 2,
    });

    if (contacts.length === 0) {
      return { field: 'contactEmail', error: 'Khong tim thay Contact trong cung to chuc.' };
    }

    if (contacts.length > 1) {
      return {
        field: 'contactEmail',
        error: 'Tim thay nhieu ban ghi trung, vui long dung ID hoac du lieu cu the hon.',
      };
    }

    if (accountId && contacts[0].accountId !== accountId) {
      return { field: 'contactEmail', error: 'Contact khong thuoc Account da chon.' };
    }

    return { contactId: contacts[0].id };
  }
}
