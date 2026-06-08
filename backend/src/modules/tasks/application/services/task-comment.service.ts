import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AuditAction, AuditLogService } from '../../../../infrastructure/audit/audit-log.service';
import { StorageService } from '../../../../shared/storage/storage.service';
import { TokenPayload } from '../../../../infrastructure/security/token.service';
import {
  CreateTaskCommentDto,
  TaskCommentResponseDto,
  UpdateTaskCommentDto,
} from '../dto/task-comment.dto';

type UploadedTaskFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

type TaskCommentUser = Pick<TokenPayload, 'sub' | 'organizationId' | 'role'>;

@Injectable()
export class TaskCommentService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private auditLog: AuditLogService,
  ) {}

  async findAll(
    taskId: string,
    user: TaskCommentUser,
  ): Promise<TaskCommentResponseDto[]> {
    await this.assertTaskVisible(taskId, user);

    const comments = await this.prisma.taskComment.findMany({
      where: { taskId, organizationId: user.organizationId },
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
    user: TaskCommentUser,
    dto: CreateTaskCommentDto,
    files: UploadedTaskFile[] = [],
  ): Promise<TaskCommentResponseDto> {
    await this.assertTaskVisible(taskId, user);
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
          organizationId: user.organizationId,
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
          organizationId: user.organizationId,
          taskId,
          authorId: user.sub,
          content,
          attachments: {
            create: uploadedFiles.map((file) => ({
              id: file.id,
              organizationId: user.organizationId,
              taskId,
              uploadedById: user.sub,
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
        organizationId: user.organizationId,
        userId: user.sub,
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

  async update(
    taskId: string,
    commentId: string,
    user: TaskCommentUser,
    dto: UpdateTaskCommentDto,
  ): Promise<TaskCommentResponseDto> {
    await this.assertTaskVisible(taskId, user);

    const content = dto.content?.trim();
    if (!content) {
      throw new BadRequestException('Nội dung bình luận không được để trống.');
    }

    const comment = await this.prisma.taskComment.findFirst({
      where: {
        id: commentId,
        taskId,
        organizationId: user.organizationId,
        deletedAt: null,
      },
    });

    if (!comment) {
      throw new NotFoundException('Không tìm thấy bình luận.');
    }

    if (comment.authorId !== user.sub) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa bình luận này.');
    }

    const updatedComment = await this.prisma.taskComment.update({
      where: { id: commentId },
      data: { content },
      include: {
        author: true,
        attachments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    await this.auditLog.log({
      organizationId: user.organizationId,
      userId: user.sub,
      action: AuditAction.UPDATE,
      entityType: 'TaskComment',
      entityId: commentId,
      oldValues: { content: comment.content },
      newValues: { content },
    });

    return this.mapToResponse(updatedComment);
  }

  async delete(
    taskId: string,
    commentId: string,
    user: TaskCommentUser,
  ): Promise<TaskCommentResponseDto> {
    await this.assertTaskVisible(taskId, user);

    const comment = await this.prisma.taskComment.findFirst({
      where: {
        id: commentId,
        taskId,
        organizationId: user.organizationId,
        deletedAt: null,
      },
      include: {
        author: true,
        attachments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Không tìm thấy bình luận.');
    }

    const canDeleteOther = user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
    if (comment.authorId !== user.sub && !canDeleteOther) {
      throw new ForbiddenException('Bạn không có quyền xóa bình luận này.');
    }

    const deletedComment = await this.prisma.taskComment.update({
      where: { id: commentId },
      data: {
        deletedAt: new Date(),
        deletedById: user.sub,
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
      organizationId: user.organizationId,
      userId: user.sub,
      action: AuditAction.SOFT_DELETE,
      entityType: 'TaskComment',
      entityId: commentId,
      oldValues: { content: comment.content, authorId: comment.authorId },
      newValues: { deletedAt: deletedComment.deletedAt, deletedById: user.sub },
    });

    return this.mapToResponse(deletedComment);
  }

  private async assertTaskVisible(taskId: string, user: TaskCommentUser) {
    const restrictedRoles = [UserRole.SALES, UserRole.SUPPORT] as string[];
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId: user.organizationId,
        deletedAt: null,
        ...(restrictedRoles.includes(user.role)
          ? {
              OR: [
                { ownerId: user.sub },
                { assignedToId: user.sub },
              ],
            }
          : {}),
      },
    });

    if (!task) {
      throw new NotFoundException('Không tìm thấy công việc.');
    }

    return task;
  }

  private async mapToResponse(comment: any): Promise<TaskCommentResponseDto> {
    const isDeleted = Boolean(comment.deletedAt);
    const attachments = await Promise.all(
      (isDeleted ? [] : comment.attachments || []).map(async (attachment: any) => ({
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
      content: isDeleted ? 'Tin nhắn đã bị xóa.' : comment.content || undefined,
      isDeleted,
      isEdited:
        !isDeleted &&
        Boolean(comment.updatedAt && comment.createdAt) &&
        new Date(comment.updatedAt).getTime() !== new Date(comment.createdAt).getTime(),
      deletedAt: comment.deletedAt || undefined,
      deletedById: comment.deletedById || undefined,
      attachments,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}
