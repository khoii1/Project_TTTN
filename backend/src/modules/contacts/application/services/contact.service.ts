import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { CreateContactDto, UpdateContactDto, ContactResponseDto } from '../dto/contact.dto';
import { calculatePagination, calculateMeta } from '../../../../common/pagination/pagination.utils';
import { PaginatedResponse } from '../../../../common/types/response.types';
import { randomUUID } from 'crypto';
import { AuditLogService, AuditAction } from '../../../../infrastructure/audit/audit-log.service';

@Injectable()
export class ContactService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
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
    search?: string
  ): Promise<PaginatedResponse<ContactResponseDto>> {
    const { skip } = calculatePagination({ page, limit });

    const where: any = {
      organizationId,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
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

  async delete(contactId: string, organizationId: string): Promise<void> {
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
    await this.prisma.contact.update({
      where: { id: contactId },
      data: { deletedAt: new Date() },
    });

    await this.auditLog.log({
      organizationId,
      userId: contact.ownerId,
      action: AuditAction.SOFT_DELETE,
      entityType: 'Contact',
      entityId: contactId,
      oldValues: { firstName: contact.firstName, lastName: contact.lastName },
    });
  }

  private mapToResponseDto(contact: any): ContactResponseDto {
    return {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      title: contact.title,
      email: contact.email,
      phone: contact.phone,
      description: contact.description,
      mailingCountry: contact.mailingCountry,
      mailingStreet: contact.mailingStreet,
      mailingCity: contact.mailingCity,
      mailingState: contact.mailingState,
      mailingPostalCode: contact.mailingPostalCode,
      accountId: contact.accountId,
      ownerId: contact.ownerId,
      organizationId: contact.organizationId,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    };
  }
}
