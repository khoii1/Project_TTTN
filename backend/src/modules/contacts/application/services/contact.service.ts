import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { CreateContactDto, UpdateContactDto, ContactResponseDto } from '../dto/contact.dto';
import { calculatePagination, calculateMeta } from '../../../../common/pagination/pagination.utils';
import { PaginatedResponse } from '../../../../common/types/response.types';
import { randomUUID } from 'crypto';
import { AuditLogService, AuditAction } from '../../../../infrastructure/audit/audit-log.service';
import { ImportCsvResult } from '../../../../common/import-csv/import-csv.types';
import {
  addImportError,
  addImportSkipped,
  buildEmptyImportResult,
  compactString,
  hasSystemFields,
  isValidEmail,
  parseCsvBuffer,
  pickAllowedFields,
} from '../../../../common/import-csv/import-csv.utils';

@Injectable()
export class ContactService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService
  ) {}

  async create(
    organizationId: string,
    ownerId: string,
    dto: CreateContactDto
  ): Promise<ContactResponseDto> {
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

    const contact = await this.prisma.contact.create({
      data: {
        id: randomUUID(),
        organizationId,
        ownerId,
        accountId: dto.accountId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        title: dto.title,
        email: dto.email,
        phone: dto.phone,
        source: dto.source,
        sourceDetail: dto.sourceDetail,
        description: dto.description,
        mailingCountry: dto.mailingCountry,
        mailingStreet: dto.mailingStreet,
        mailingCity: dto.mailingCity,
        mailingState: dto.mailingState,
        mailingPostalCode: dto.mailingPostalCode,
      },
    });

    await this.auditLog.log({
      organizationId,
      userId: ownerId,
      action: AuditAction.CREATE,
      entityType: 'Contact',
      entityId: contact.id,
      newValues: { firstName: dto.firstName, lastName: dto.lastName, email: dto.email },
    });

    return this.mapToResponseDto(contact);
  }

  async importCsv(
    organizationId: string,
    ownerId: string,
    buffer: Buffer
  ): Promise<ImportCsvResult> {
    const rows = parseCsvBuffer(buffer);
    const result = buildEmptyImportResult(rows.length);
    const allowedFields = [
      'firstName',
      'lastName',
      'title',
      'email',
      'phone',
      'source',
      'sourceDetail',
      'description',
      'accountName',
      'accountId',
      'mailingCountry',
      'mailingStreet',
      'mailingCity',
      'mailingState',
      'mailingPostalCode',
    ];

    for (const row of rows) {
      const systemField = hasSystemFields(row.values);
      if (systemField && systemField !== 'accountId') {
        addImportError(
          result,
          row.rowNumber,
          systemField,
          `Khong duoc import field he thong "${systemField}".`,
        );
        continue;
      }

      const data = pickAllowedFields(row.values, allowedFields);
      const lastName = compactString(data.lastName);
      const email = compactString(data.email);
      if (!lastName) {
        addImportError(result, row.rowNumber, 'lastName', 'Ho la bat buoc.');
        continue;
      }

      if (!isValidEmail(email)) {
        addImportError(result, row.rowNumber, 'email', 'Email khong hop le.');
        continue;
      }

      if (email) {
        const duplicatedContact = await this.prisma.contact.findFirst({
          where: {
            organizationId,
            deletedAt: null,
            email,
          },
        });

        if (duplicatedContact) {
          addImportSkipped(
            result,
            row.rowNumber,
            'email',
            `Contact co email "${email}" da ton tai trong to chuc.`,
          );
          continue;
        }
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

      try {
        const contact = await this.prisma.contact.create({
          data: {
            id: randomUUID(),
            organizationId,
            ownerId,
            accountId: accountResult.accountId!,
            firstName: compactString(data.firstName),
            lastName,
            title: compactString(data.title),
            email,
            phone: compactString(data.phone),
            source: compactString(data.source) || 'IMPORT_CSV',
            sourceDetail: compactString(data.sourceDetail),
            description: compactString(data.description),
            mailingCountry: compactString(data.mailingCountry),
            mailingStreet: compactString(data.mailingStreet),
            mailingCity: compactString(data.mailingCity),
            mailingState: compactString(data.mailingState),
            mailingPostalCode: compactString(data.mailingPostalCode),
          },
        });

        await this.auditLog.log({
          organizationId,
          userId: ownerId,
          action: AuditAction.CREATE,
          entityType: 'Contact',
          entityId: contact.id,
          newValues: { firstName: contact.firstName, lastName: contact.lastName, email: contact.email },
        });

        result.successCount += 1;
      } catch {
        addImportError(result, row.rowNumber, undefined, 'Khong the import dong nay.');
      }
    }

    return result;
  }

  async findById(contactId: string, organizationId: string): Promise<ContactResponseDto> {
    const contact = await this.prisma.contact.findFirst({
      where: {
        id: contactId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return this.mapToResponseDto(contact);
  }

  async findAll(
    organizationId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    source?: string,
    deleted: boolean = false,
    accountId?: string
  ): Promise<PaginatedResponse<ContactResponseDto>> {
    const { skip } = calculatePagination({ page, limit });

    const where: any = {
      organizationId,
      deletedAt: deleted ? { not: null } : null,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (accountId) {
      where.accountId = accountId;
    }

    if (source) {
      where.source = source;
    }

    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      data: contacts.map((contact) => this.mapToResponseDto(contact)),
      meta: calculateMeta(page, limit, total),
    };
  }

  async update(
    contactId: string,
    organizationId: string,
    dto: UpdateContactDto
  ): Promise<ContactResponseDto> {
    const contact = await this.prisma.contact.findFirst({
      where: {
        id: contactId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const updatedContact = await this.prisma.contact.update({
      where: { id: contactId },
      data: {
        firstName: dto.firstName !== undefined ? dto.firstName : contact.firstName,
        lastName: dto.lastName || contact.lastName,
        title: dto.title !== undefined ? dto.title : contact.title,
        email: dto.email !== undefined ? dto.email : contact.email,
        phone: dto.phone !== undefined ? dto.phone : contact.phone,
        source: dto.source !== undefined ? dto.source : contact.source,
        sourceDetail: dto.sourceDetail !== undefined ? dto.sourceDetail : contact.sourceDetail,
        description: dto.description !== undefined ? dto.description : contact.description,
        mailingCountry:
          dto.mailingCountry !== undefined ? dto.mailingCountry : contact.mailingCountry,
        mailingStreet: dto.mailingStreet !== undefined ? dto.mailingStreet : contact.mailingStreet,
        mailingCity: dto.mailingCity !== undefined ? dto.mailingCity : contact.mailingCity,
        mailingState: dto.mailingState !== undefined ? dto.mailingState : contact.mailingState,
        mailingPostalCode:
          dto.mailingPostalCode !== undefined ? dto.mailingPostalCode : contact.mailingPostalCode,
      },
    });

    await this.auditLog.log({
      organizationId,
      userId: contact.ownerId,
      action: AuditAction.UPDATE,
      entityType: 'Contact',
      entityId: contactId,
      oldValues: { firstName: contact.firstName, lastName: contact.lastName },
      newValues: dto,
    });

    return this.mapToResponseDto(updatedContact);
  }

  async delete(contactId: string, organizationId: string, deletedById: string): Promise<void> {
    const contact = await this.prisma.contact.findFirst({
      where: {
        id: contactId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // Soft delete
    const deletedAt = new Date();
    await this.prisma.contact.update({
      where: { id: contactId },
      data: { deletedAt, deletedById },
    });

    await this.auditLog.log({
      organizationId,
      userId: deletedById,
      action: AuditAction.SOFT_DELETE,
      entityType: 'Contact',
      entityId: contactId,
      oldValues: { firstName: contact.firstName, lastName: contact.lastName },
      newValues: { deletedAt, deletedById },
    });
  }

  async restore(
    contactId: string,
    organizationId: string,
    restoredById: string
  ): Promise<ContactResponseDto> {
    const contact = await this.prisma.contact.findFirst({
      where: {
        id: contactId,
        organizationId,
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    if (!contact.deletedAt) {
      return this.mapToResponseDto(contact);
    }

    const restoredContact = await this.prisma.contact.update({
      where: { id: contactId },
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
      entityType: 'Contact',
      entityId: contactId,
      oldValues: { deletedAt: contact.deletedAt },
      newValues: {
        deletedAt: null,
        restoredAt: restoredContact.restoredAt,
        restoredById,
      },
    });

    return this.mapToResponseDto(restoredContact);
  }

  private mapToResponseDto(contact: any): ContactResponseDto {
    return {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      title: contact.title,
      email: contact.email,
      phone: contact.phone,
      source: contact.source,
      sourceDetail: contact.sourceDetail,
      description: contact.description,
      mailingCountry: contact.mailingCountry,
      mailingStreet: contact.mailingStreet,
      mailingCity: contact.mailingCity,
      mailingState: contact.mailingState,
      mailingPostalCode: contact.mailingPostalCode,
      accountId: contact.accountId,
      ownerId: contact.ownerId,
      organizationId: contact.organizationId,
      deletedAt: contact.deletedAt,
      deletedById: contact.deletedById,
      restoredAt: contact.restoredAt,
      restoredById: contact.restoredById,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    };
  }

  private async resolveAccountId(
    organizationId: string,
    accountId?: string,
    accountName?: string,
  ): Promise<{ accountId?: string; field?: string; error?: string }> {
    if (accountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: accountId, organizationId, deletedAt: null },
      });
      return account
        ? { accountId: account.id }
        : { field: 'accountId', error: 'Khong tim thay Account trong cung to chuc.' };
    }

    if (!accountName) {
      return { field: 'accountName', error: 'accountName hoac accountId la bat buoc.' };
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
}
