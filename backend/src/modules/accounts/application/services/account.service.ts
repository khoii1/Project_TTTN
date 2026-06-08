import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { CreateAccountDto, UpdateAccountDto, AccountResponseDto } from '../dto/account.dto';
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
  parseCsvBuffer,
  pickAllowedFields,
} from '../../../../common/import-csv/import-csv.utils';
import { ownerVisibilityWhere, RecordVisibilityUser } from '../../../../common/security/record-visibility';

@Injectable()
export class AccountService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async create(
    organizationId: string,
    ownerId: string,
    dto: CreateAccountDto
  ): Promise<AccountResponseDto> {
    const account = await this.prisma.account.create({
      data: {
        id: randomUUID(),
        organizationId,
        ownerId,
        name: dto.name,
        website: dto.website,
        type: dto.type,
        phone: dto.phone,
        source: dto.source,
        sourceDetail: dto.sourceDetail,
        description: dto.description,
        billingCountry: dto.billingCountry,
        billingStreet: dto.billingStreet,
        billingCity: dto.billingCity,
        billingState: dto.billingState,
        billingPostalCode: dto.billingPostalCode,
        shippingCountry: dto.shippingCountry,
        shippingStreet: dto.shippingStreet,
        shippingCity: dto.shippingCity,
        shippingState: dto.shippingState,
        shippingPostalCode: dto.shippingPostalCode,
      },
    });

    await this.auditLog.log({
      organizationId,
      userId: ownerId,
      action: AuditAction.CREATE,
      entityType: 'Account',
      entityId: account.id,
      newValues: { name: dto.name, type: dto.type },
    });

    return this.mapToResponseDto(account);
  }

  async importCsv(
    organizationId: string,
    ownerId: string,
    buffer: Buffer
  ): Promise<ImportCsvResult> {
    const rows = parseCsvBuffer(buffer);
    const result = buildEmptyImportResult(rows.length);
    const allowedFields = [
      'name',
      'website',
      'type',
      'phone',
      'source',
      'sourceDetail',
      'description',
      'billingCountry',
      'billingStreet',
      'billingCity',
      'billingState',
      'billingPostalCode',
      'shippingCountry',
      'shippingStreet',
      'shippingCity',
      'shippingState',
      'shippingPostalCode',
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
      const name = compactString(data.name);
      if (!name) {
        addImportError(result, row.rowNumber, 'name', 'Ten Account la bat buoc.');
        continue;
      }

      const duplicatedAccount = await this.prisma.account.findFirst({
        where: {
          organizationId,
          deletedAt: null,
          name: { equals: name, mode: 'insensitive' },
        },
      });

      if (duplicatedAccount) {
        addImportSkipped(
          result,
          row.rowNumber,
          'name',
          `Account co ten "${name}" da ton tai trong to chuc.`,
        );
        continue;
      }

      try {
        const account = await this.prisma.account.create({
          data: {
            id: randomUUID(),
            organizationId,
            ownerId,
            name,
            website: compactString(data.website),
            type: compactString(data.type),
            phone: compactString(data.phone),
            source: compactString(data.source) || 'IMPORT_CSV',
            sourceDetail: compactString(data.sourceDetail),
            description: compactString(data.description),
            billingCountry: compactString(data.billingCountry),
            billingStreet: compactString(data.billingStreet),
            billingCity: compactString(data.billingCity),
            billingState: compactString(data.billingState),
            billingPostalCode: compactString(data.billingPostalCode),
            shippingCountry: compactString(data.shippingCountry),
            shippingStreet: compactString(data.shippingStreet),
            shippingCity: compactString(data.shippingCity),
            shippingState: compactString(data.shippingState),
            shippingPostalCode: compactString(data.shippingPostalCode),
          },
        });

        await this.auditLog.log({
          organizationId,
          userId: ownerId,
          action: AuditAction.CREATE,
          entityType: 'Account',
          entityId: account.id,
          newValues: { name: account.name, type: account.type },
        });

        result.successCount += 1;
      } catch {
        addImportError(result, row.rowNumber, undefined, 'Khong the import dong nay.');
      }
    }

    return result;
  }

  async findById(
    accountId: string,
    organizationId: string,
    user?: RecordVisibilityUser,
  ): Promise<AccountResponseDto> {
    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        organizationId,
        deletedAt: null,
        ...ownerVisibilityWhere(user),
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return this.mapToResponseDto(account);
  }

  async findAll(
    organizationId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    source?: string,
    deleted: boolean = false,
    user?: RecordVisibilityUser,
  ): Promise<PaginatedResponse<AccountResponseDto>> {
    const { skip } = calculatePagination({ page, limit });

    const where: any = {
      organizationId,
      deletedAt: deleted ? { not: null } : null,
      ...ownerVisibilityWhere(user),
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { website: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (source) {
      where.source = source;
    }

    const [accounts, total] = await Promise.all([
      this.prisma.account.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.account.count({ where }),
    ]);

    return {
      data: accounts.map((account) => this.mapToResponseDto(account)),
      meta: calculateMeta(page, limit, total),
    };
  }

  async update(
    accountId: string,
    organizationId: string,
    dto: UpdateAccountDto,
    user?: RecordVisibilityUser,
  ): Promise<AccountResponseDto> {
    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        organizationId,
        deletedAt: null,
        ...ownerVisibilityWhere(user),
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const updatedAccount = await this.prisma.account.update({
      where: { id: accountId },
      data: {
        name: dto.name || account.name,
        website: dto.website !== undefined ? dto.website : account.website,
        type: dto.type !== undefined ? dto.type : account.type,
        phone: dto.phone !== undefined ? dto.phone : account.phone,
        source: dto.source !== undefined ? dto.source : account.source,
        sourceDetail: dto.sourceDetail !== undefined ? dto.sourceDetail : account.sourceDetail,
        description: dto.description !== undefined ? dto.description : account.description,
        billingCountry:
          dto.billingCountry !== undefined ? dto.billingCountry : account.billingCountry,
        billingStreet: dto.billingStreet !== undefined ? dto.billingStreet : account.billingStreet,
        billingCity: dto.billingCity !== undefined ? dto.billingCity : account.billingCity,
        billingState: dto.billingState !== undefined ? dto.billingState : account.billingState,
        billingPostalCode:
          dto.billingPostalCode !== undefined ? dto.billingPostalCode : account.billingPostalCode,
        shippingCountry:
          dto.shippingCountry !== undefined ? dto.shippingCountry : account.shippingCountry,
        shippingStreet:
          dto.shippingStreet !== undefined ? dto.shippingStreet : account.shippingStreet,
        shippingCity: dto.shippingCity !== undefined ? dto.shippingCity : account.shippingCity,
        shippingState: dto.shippingState !== undefined ? dto.shippingState : account.shippingState,
        shippingPostalCode:
          dto.shippingPostalCode !== undefined
            ? dto.shippingPostalCode
            : account.shippingPostalCode,
      },
    });

    await this.auditLog.log({
      organizationId,
      userId: account.ownerId,
      action: AuditAction.UPDATE,
      entityType: 'Account',
      entityId: accountId,
      oldValues: { name: account.name },
      newValues: dto,
    });

    return this.mapToResponseDto(updatedAccount);
  }

  async delete(
    accountId: string,
    organizationId: string,
    deletedById: string,
    user?: RecordVisibilityUser,
  ): Promise<void> {
    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        organizationId,
        deletedAt: null,
        ...ownerVisibilityWhere(user),
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Soft delete
    const deletedAt = new Date();
    await this.prisma.account.update({
      where: { id: accountId },
      data: { deletedAt, deletedById },
    });

    await this.auditLog.log({
      organizationId,
      userId: deletedById,
      action: AuditAction.SOFT_DELETE,
      entityType: 'Account',
      entityId: accountId,
      oldValues: { name: account.name },
      newValues: { deletedAt, deletedById },
    });
  }

  async restore(
    accountId: string,
    organizationId: string,
    restoredById: string,
    user?: RecordVisibilityUser,
  ): Promise<AccountResponseDto> {
    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        organizationId,
        ...ownerVisibilityWhere(user),
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (!account.deletedAt) {
      return this.mapToResponseDto(account);
    }

    const restoredAccount = await this.prisma.account.update({
      where: { id: accountId },
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
      entityType: 'Account',
      entityId: accountId,
      oldValues: { deletedAt: account.deletedAt },
      newValues: {
        deletedAt: null,
        restoredAt: restoredAccount.restoredAt,
        restoredById,
      },
    });

    return this.mapToResponseDto(restoredAccount);
  }

  private mapToResponseDto(account: any): AccountResponseDto {
    return {
      id: account.id,
      name: account.name,
      website: account.website,
      type: account.type,
      phone: account.phone,
      source: account.source,
      sourceDetail: account.sourceDetail,
      description: account.description,
      billingCountry: account.billingCountry,
      billingStreet: account.billingStreet,
      billingCity: account.billingCity,
      billingState: account.billingState,
      billingPostalCode: account.billingPostalCode,
      shippingCountry: account.shippingCountry,
      shippingStreet: account.shippingStreet,
      shippingCity: account.shippingCity,
      shippingState: account.shippingState,
      shippingPostalCode: account.shippingPostalCode,
      ownerId: account.ownerId,
      organizationId: account.organizationId,
      deletedAt: account.deletedAt,
      deletedById: account.deletedById,
      restoredAt: account.restoredAt,
      restoredById: account.restoredById,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }
}
