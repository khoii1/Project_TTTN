import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  AuditAction,
  AuditLogService,
} from '../../../../infrastructure/audit/audit-log.service';
import { TokenPayload } from '../../../../infrastructure/security/token.service';
import { ownerVisibilityWhere } from '../../../../common/security/record-visibility';
import { StorageService } from '../../../../shared/storage/storage.service';
import { OpportunityAttachmentResponseDto } from '../dto/opportunity-attachment.dto';

type UploadedOpportunityFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

type OpportunityAttachmentUser = Pick<
  TokenPayload,
  'sub' | 'organizationId' | 'role'
>;

@Injectable()
export class OpportunityAttachmentService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private auditLog: AuditLogService,
  ) {}

  async findAll(
    opportunityId: string,
    user: OpportunityAttachmentUser,
  ): Promise<OpportunityAttachmentResponseDto[]> {
    await this.assertOpportunityVisible(opportunityId, user);

    const attachments = await this.prisma.opportunityAttachment.findMany({
      where: {
        opportunityId,
        organizationId: user.organizationId,
        deletedAt: null,
      },
      include: { uploadedBy: true },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(attachments.map((item) => this.mapToResponse(item)));
  }

  async upload(
    opportunityId: string,
    user: OpportunityAttachmentUser,
    files: UploadedOpportunityFile[] = [],
  ): Promise<OpportunityAttachmentResponseDto[]> {
    await this.assertOpportunityVisible(opportunityId, user);
    this.storageService.validateFiles(files);

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
        const attachmentId = randomUUID();
        const storagePath = this.storageService.buildOpportunityAttachmentPath({
          organizationId: user.organizationId,
          opportunityId,
          attachmentId,
          originalName: file.originalname,
        });

        await this.storageService.uploadFile(file, storagePath);
        uploadedFiles.push({
          id: attachmentId,
          fileName: storagePath.split('/').pop() || file.originalname,
          originalName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          storageBucket: this.storageService.getBucket(),
          storagePath,
        });
      }

      const created = await this.prisma.$transaction(
        uploadedFiles.map((file) =>
          this.prisma.opportunityAttachment.create({
            data: {
              id: file.id,
              organizationId: user.organizationId,
              opportunityId,
              uploadedById: user.sub,
              fileName: file.fileName,
              originalName: file.originalName,
              mimeType: file.mimeType,
              fileSize: file.fileSize,
              storageBucket: file.storageBucket,
              storagePath: file.storagePath,
            },
            include: { uploadedBy: true },
          }),
        ),
      );

      await this.auditLog.log({
        organizationId: user.organizationId,
        userId: user.sub,
        action: AuditAction.CREATE,
        entityType: 'OpportunityAttachment',
        entityId: opportunityId,
        newValues: { opportunityId, attachmentCount: created.length },
      });

      return Promise.all(created.map((item) => this.mapToResponse(item)));
    } catch (error) {
      await Promise.all(
        uploadedFiles.map((file) =>
          this.storageService.deleteFile(file.storagePath),
        ),
      );
      throw error;
    }
  }

  async delete(
    opportunityId: string,
    attachmentId: string,
    user: OpportunityAttachmentUser,
  ): Promise<{ message: string }> {
    await this.assertOpportunityVisible(opportunityId, user);

    const attachment = await this.prisma.opportunityAttachment.findFirst({
      where: {
        id: attachmentId,
        opportunityId,
        organizationId: user.organizationId,
        deletedAt: null,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Không tìm thấy tệp đính kèm.');
    }

    const canDeleteOther =
      user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
    if (attachment.uploadedById !== user.sub && !canDeleteOther) {
      throw new ForbiddenException('Bạn không có quyền xóa tệp đính kèm này.');
    }

    await this.prisma.opportunityAttachment.update({
      where: { id: attachment.id },
      data: {
        deletedAt: new Date(),
        deletedById: user.sub,
      },
    });
    await this.storageService.deleteFile(attachment.storagePath);

    await this.auditLog.log({
      organizationId: user.organizationId,
      userId: user.sub,
      action: AuditAction.SOFT_DELETE,
      entityType: 'OpportunityAttachment',
      entityId: attachment.id,
      oldValues: {
        opportunityId,
        originalName: attachment.originalName,
        uploadedById: attachment.uploadedById,
      },
      newValues: { deletedAt: new Date(), deletedById: user.sub },
    });

    return { message: 'Đã xóa tệp đính kèm.' };
  }

  async getSignedUrl(
    opportunityId: string,
    attachmentId: string,
    user: OpportunityAttachmentUser,
  ): Promise<{ signedUrl: string }> {
    await this.assertOpportunityVisible(opportunityId, user);

    const attachment = await this.prisma.opportunityAttachment.findFirst({
      where: {
        id: attachmentId,
        opportunityId,
        organizationId: user.organizationId,
        deletedAt: null,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Không tìm thấy tệp đính kèm.');
    }

    return {
      signedUrl: await this.storageService.createSignedUrl(
        attachment.storagePath,
      ),
    };
  }

  private async assertOpportunityVisible(
    opportunityId: string,
    user: OpportunityAttachmentUser,
  ) {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: {
        id: opportunityId,
        organizationId: user.organizationId,
        deletedAt: null,
        ...ownerVisibilityWhere(user),
      },
    });

    if (!opportunity) {
      throw new NotFoundException('Không tìm thấy cơ hội bán hàng.');
    }

    return opportunity;
  }

  private async mapToResponse(
    attachment: any,
  ): Promise<OpportunityAttachmentResponseDto> {
    return {
      id: attachment.id,
      opportunityId: attachment.opportunityId,
      fileName: attachment.fileName,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
      isImage: this.storageService.isImage(attachment.mimeType),
      signedUrl: await this.storageService.createSignedUrl(
        attachment.storagePath,
      ),
      uploadedById: attachment.uploadedById,
      uploadedByName:
        [attachment.uploadedBy?.firstName, attachment.uploadedBy?.lastName]
          .filter(Boolean)
          .join(' ') || 'Người dùng',
      uploadedByEmail: attachment.uploadedBy?.email || '',
      createdAt: attachment.createdAt,
    };
  }
}
