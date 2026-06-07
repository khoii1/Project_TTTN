import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AuditAction, AuditLogService } from '../../../../infrastructure/audit/audit-log.service';
import { StorageService } from '../../../../shared/storage/storage.service';
import {
  CreateTaskCommentDto,
  TaskCommentResponseDto,
} from '../dto/task-comment.dto';

type UploadedTaskFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class TaskCommentService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private auditLog: AuditLogService,
  ) {}

  async findAll(
    taskId: string,
    organizationId: string,
  ): Promise<TaskCommentResponseDto[]> {
    await this.assertTaskVisible(taskId, organizationId);

    const comments = await this.prisma.taskComment.findMany({
      where: { taskId, organizationId, deletedAt: null },
      include: {
        author: true,
        attachments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return Promise.all(comments.map((comment) => this.mapToResponse(comment)));
  }

  async create(
    taskId: string,
    organizationId: string,
    authorId: string,
    dto: CreateTaskCommentDto,
    files: UploadedTaskFile[] = [],
  ): Promise<TaskCommentResponseDto> {
    await this.assertTaskVisible(taskId, organizationId);
    this.storageService.validateFiles(files);

    const content = dto.content?.trim();
    if (!content && files.length === 0) {
      throw new BadRequestException('Vui lòng nhập nội dung hoặc chọn file đính kèm.');
    }

    const commentId = randomUUID();
    const uploadedFiles: Array<{
      id: string;
      fileName: string;
      originalName: string;
      mimeType: string;
      fileSize: number;
      storageBucket: string;
      storagePath: string;
    }> = [];

    try {
      for (const file of files) {
        const storagePath = this.storageService.buildStoragePath({
          organizationId,
          taskId,
          commentId,
          originalName: file.originalname,
        });
        await this.storageService.uploadFile(file, storagePath);
        uploadedFiles.push({
          id: randomUUID(),
          fileName: storagePath.split('/').pop() || file.originalname,
          originalName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          storageBucket: this.storageService.getBucket(),
          storagePath,
        });
      }

      const comment = await this.prisma.taskComment.create({
        data: {
          id: commentId,
          organizationId,
          taskId,
          authorId,
          content,
          attachments: {
            create: uploadedFiles.map((file) => ({
              id: file.id,
              organizationId,
              taskId,
              uploadedById: authorId,
              fileName: file.fileName,
              originalName: file.originalName,
              mimeType: file.mimeType,
              fileSize: file.fileSize,
              storageBucket: file.storageBucket,
              storagePath: file.storagePath,
            })),
          },
        },
        include: {
          author: true,
          attachments: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      await this.auditLog.log({
        organizationId,
        userId: authorId,
        action: AuditAction.CREATE,
        entityType: 'TaskComment',
        entityId: comment.id,
        newValues: {
          taskId,
          hasContent: Boolean(content),
          attachmentCount: uploadedFiles.length,
        },
      });

      return this.mapToResponse(comment);
    } catch (error) {
      await Promise.all(
        uploadedFiles.map((file) => this.storageService.deleteFile(file.storagePath)),
      );
      throw error;
    }
  }

  private async assertTaskVisible(taskId: string, organizationId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId, deletedAt: null },
    });

    if (!task) {
      throw new NotFoundException('Không tìm thấy công việc.');
    }

    return task;
  }

  private async mapToResponse(comment: any): Promise<TaskCommentResponseDto> {
    const attachments = await Promise.all(
      (comment.attachments || []).map(async (attachment: any) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
        isImage: this.storageService.isImage(attachment.mimeType),
        signedUrl: await this.storageService.createSignedUrl(attachment.storagePath),
        createdAt: attachment.createdAt,
      })),
    );

    return {
      id: comment.id,
      taskId: comment.taskId,
      authorId: comment.authorId,
      authorName: [comment.author?.firstName, comment.author?.lastName]
        .filter(Boolean)
        .join(' ') || 'Người dùng',
      authorEmail: comment.author?.email || '',
      content: comment.content || undefined,
      attachments,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}
