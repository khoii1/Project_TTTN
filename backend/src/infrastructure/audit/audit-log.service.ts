import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { randomUUID } from 'crypto';

export interface AuditLogParams {
  organizationId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
}

// Standard action constants
export const AuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  SOFT_DELETE: 'SOFT_DELETE',
  LEAD_CONVERSION: 'LEAD_CONVERSION',
  STAGE_CHANGE: 'STAGE_CHANGE',
  STATUS_CHANGE: 'STATUS_CHANGE',
  TASK_COMPLETION: 'TASK_COMPLETION',
  RESTORE: 'RESTORE',
} as const;

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async log(params: AuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          id: randomUUID(),
          organizationId: params.organizationId,
          userId: params.userId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          oldValues: params.oldValues ?? undefined,
          newValues: params.newValues ?? undefined,
        },
      });
    } catch (error) {
      // Audit logging should never break the main operation
      console.error('Failed to write audit log:', error);
    }
  }
}
