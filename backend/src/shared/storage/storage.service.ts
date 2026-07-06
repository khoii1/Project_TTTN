import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type UploadableFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

export const TASK_ATTACHMENT_MAX_FILES = 5;
export const TASK_ATTACHMENT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
]);

@Injectable()
export class StorageService {
  private client?: SupabaseClient;
  private readonly bucket: string;
  private readonly signedUrlExpiresSeconds: number;

  constructor(private configService: ConfigService) {
    this.bucket =
      this.configService.get<string>('SUPABASE_STORAGE_BUCKET') || 'task-attachments';
    this.signedUrlExpiresSeconds = Number(
      this.configService.get<string>('SUPABASE_SIGNED_URL_EXPIRES_SECONDS') || 900,
    );

    const url = this.configService.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (url && serviceRoleKey) {
      this.client = createClient(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
  }

  getBucket() {
    return this.bucket;
  }

  validateFiles(files: UploadableFile[] = []) {
    if (files.length > TASK_ATTACHMENT_MAX_FILES) {
      throw new BadRequestException(
        `Chỉ được đính kèm tối đa ${TASK_ATTACHMENT_MAX_FILES} file mỗi lần.`,
      );
    }

    for (const file of files) {
      if (!file.buffer || !file.originalname) {
        throw new BadRequestException('File đính kèm không hợp lệ.');
      }

      if (file.size > TASK_ATTACHMENT_MAX_FILE_SIZE_BYTES) {
        throw new BadRequestException(
          `File "${file.originalname}" vượt quá giới hạn 5MB.`,
        );
      }

      if (!allowedMimeTypes.has(file.mimetype)) {
        throw new BadRequestException(
          `File "${file.originalname}" không đúng định dạng được hỗ trợ.`,
        );
      }
    }
  }

  buildStoragePath(params: {
    organizationId: string;
    taskId: string;
    commentId: string;
    originalName: string;
  }) {
    const safeName = this.safeFileName(params.originalName);
    return [
      'organizations',
      params.organizationId,
      'tasks',
      params.taskId,
      'comments',
      params.commentId,
      `${Date.now()}-${safeName}`,
    ].join('/');
  }

  buildOpportunityAttachmentPath(params: {
    organizationId: string;
    opportunityId: string;
    attachmentId: string;
    originalName: string;
  }) {
    const safeName = this.safeFileName(params.originalName);
    return [
      'organizations',
      params.organizationId,
      'opportunities',
      params.opportunityId,
      'attachments',
      `${Date.now()}-${params.attachmentId}-${safeName}`,
    ].join('/');
  }

  buildSalesDocumentPath(params: {
    organizationId: string;
    opportunityId: string;
    documentType: 'quotes' | 'contracts';
    documentId: string;
    originalName: string;
  }) {
    const safeName = this.safeFileName(params.originalName);
    return [
      'organizations',
      params.organizationId,
      'opportunities',
      params.opportunityId,
      params.documentType,
      `${Date.now()}-${params.documentId}-${safeName}`,
    ].join('/');
  }

  async uploadFile(file: UploadableFile, storagePath: string) {
    const client = this.getClient();
    const { error } = await client.storage.from(this.bucket).upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

    if (error) {
      throw new ServiceUnavailableException(
        `Không thể tải file "${file.originalname}" lên Supabase Storage.`,
      );
    }
  }

  async createSignedUrl(storagePath: string) {
    const client = this.getClient();
    const { data, error } = await client.storage
      .from(this.bucket)
      .createSignedUrl(storagePath, this.signedUrlExpiresSeconds);

    if (error || !data?.signedUrl) {
      throw new ServiceUnavailableException('Không thể tạo đường dẫn tải file tạm thời.');
    }

    return data.signedUrl;
  }

  async deleteFile(storagePath: string) {
    if (!this.client) {
      return;
    }
    await this.client.storage.from(this.bucket).remove([storagePath]);
  }

  async deleteFilesStrict(storagePaths: string[]) {
    const uniquePaths = [...new Set(storagePaths.filter(Boolean))];
    if (uniquePaths.length === 0) {
      return;
    }

    const client = this.getClient();
    const { error } = await client.storage.from(this.bucket).remove(uniquePaths);
    if (error) {
      throw new ServiceUnavailableException(
        'Không thể xóa file đính kèm khỏi Storage. Dữ liệu chưa bị xóa vĩnh viễn.',
      );
    }
  }

  isImage(mimeType: string) {
    return mimeType.startsWith('image/');
  }

  private getClient() {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình Supabase Storage. Vui lòng kiểm tra SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY.',
      );
    }

    return this.client;
  }

  private safeFileName(fileName: string) {
    const withoutPath = fileName.split(/[\\/]/).pop() || 'file';
    return withoutPath
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 120) || 'file';
  }
}
