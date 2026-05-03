import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { CreateNoteDto, UpdateNoteDto, NoteResponseDto } from '../dto/note.dto';
import { calculatePagination, calculateMeta } from '../../../../common/pagination/pagination.utils';
import { PaginatedResponse } from '../../../../common/types/response.types';
import { randomUUID } from 'crypto';
import { AuditLogService, AuditAction } from '../../../../infrastructure/audit/audit-log.service';

@Injectable()
export class NoteService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async create(
    organizationId: string,
    ownerId: string,
    dto: CreateNoteDto
  ): Promise<NoteResponseDto> {
    const note = await this.prisma.note.create({
      data: {
        id: randomUUID(),
        organizationId,
        ownerId,
        content: dto.content,
        relatedType: dto.relatedType,
        relatedId: dto.relatedId,
      },
    });

    await this.auditLog.log({
      organizationId,
      userId: ownerId,
      action: AuditAction.CREATE,
      entityType: 'Note',
      entityId: note.id,
      newValues: { relatedType: dto.relatedType, relatedId: dto.relatedId },
    });

    return this.mapToResponseDto(note);
  }

  async findById(noteId: string, organizationId: string): Promise<NoteResponseDto> {
    const note = await this.prisma.note.findFirst({
      where: {
        id: noteId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    return this.mapToResponseDto(note);
  }

  async findAll(
    organizationId: string,
    page: number = 1,
    limit: number = 10,
    relatedId?: string
  ): Promise<PaginatedResponse<NoteResponseDto>> {
    const { skip } = calculatePagination({ page, limit });

    const where: any = {
      organizationId,
      deletedAt: null,
    };

    if (relatedId) {
      where.relatedId = relatedId;
    }

    const [notes, total] = await Promise.all([
      this.prisma.note.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.note.count({ where }),
    ]);

    return {
      data: notes.map((note) => this.mapToResponseDto(note)),
      meta: calculateMeta(page, limit, total),
    };
  }

  async update(
    noteId: string,
    organizationId: string,
    dto: UpdateNoteDto
  ): Promise<NoteResponseDto> {
    const note = await this.prisma.note.findFirst({
      where: {
        id: noteId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    const updatedNote = await this.prisma.note.update({
      where: { id: noteId },
      data: {
        content: dto.content,
      },
    });

    await this.auditLog.log({
      organizationId,
      userId: note.ownerId,
      action: AuditAction.UPDATE,
      entityType: 'Note',
      entityId: noteId,
      oldValues: { content: note.content?.substring(0, 100) },
      newValues: { content: dto.content?.substring(0, 100) },
    });

    return this.mapToResponseDto(updatedNote);
  }

  async delete(noteId: string, organizationId: string): Promise<void> {
    const note = await this.prisma.note.findFirst({
      where: {
        id: noteId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    // Soft delete
    await this.prisma.note.update({
      where: { id: noteId },
      data: { deletedAt: new Date() },
    });

    await this.auditLog.log({
      organizationId,
      userId: note.ownerId,
      action: AuditAction.SOFT_DELETE,
      entityType: 'Note',
      entityId: noteId,
    });
  }

  private mapToResponseDto(note: any): NoteResponseDto {
    return {
      id: note.id,
      content: note.content,
      relatedType: note.relatedType,
      relatedId: note.relatedId,
      ownerId: note.ownerId,
      organizationId: note.organizationId,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  }
}
