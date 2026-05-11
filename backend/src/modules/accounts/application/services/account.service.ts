import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { CreateAccountDto, UpdateAccountDto, AccountResponseDto } from '../dto/account.dto';
import { calculatePagination, calculateMeta } from '../../../../common/pagination/pagination.utils';
import { PaginatedResponse } from '../../../../common/types/response.types';
import { randomUUID } from 'crypto';
import { AuditLogService, AuditAction } from '../../../../infrastructure/audit/audit-log.service';

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

  async findById(accountId: string, organizationId: string): Promise<AccountResponseDto> {
    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        organizationId,
        deletedAt: null,
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
    deleted: boolean = false
  ): Promise<PaginatedResponse<AccountResponseDto>> {
    const { skip } = calculatePagination({ page, limit });

    const where: any = {
      organizationId,
      deletedAt: deleted ? { not: null } : null,
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
    dto: UpdateAccountDto
  ): Promise<AccountResponseDto> {
    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        organizationId,
        deletedAt: null,
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

  async delete(accountId: string, organizationId: string, deletedById: string): Promise<void> {
    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        organizationId,
        deletedAt: null,
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
    restoredById: string
  ): Promise<AccountResponseDto> {
    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        organizationId,
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
