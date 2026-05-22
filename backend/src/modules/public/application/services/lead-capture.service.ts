import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { LeadStatus } from '@prisma/client';
import { AuditAction, AuditLogService } from '../../../../infrastructure/audit/audit-log.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { LeadCaptureDto } from '../dto/lead-capture.dto';

const SUCCESS_MESSAGE =
  'Cảm ơn bạn đã đăng ký tư vấn. Chúng tôi sẽ liên hệ lại trong thời gian sớm nhất.';
const WEBSITE_SOURCE = 'Website';
const WEBSITE_SOURCE_DETAIL = 'Form đăng ký tư vấn trên website';

export type LeadCaptureResponse = {
  message: string;
  leadId?: string;
};

@Injectable()
export class LeadCaptureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async capture(dto: LeadCaptureDto): Promise<LeadCaptureResponse> {
    if (dto.companyFaxHidden?.trim()) {
      return { message: SUCCESS_MESSAGE };
    }

    this.validatePayload(dto);

    const organizationId = process.env.PUBLIC_LEAD_ORGANIZATION_ID?.trim();
    const ownerId = process.env.PUBLIC_LEAD_OWNER_ID?.trim();

    if (!organizationId || !ownerId) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình tổ chức hoặc người phụ trách nhận Lead từ website.',
      );
    }

    await this.assertPublicLeadTarget(organizationId, ownerId);

    const { firstName, lastName } = this.splitFullName(dto.fullName);
    const description = this.buildDescription(dto);

    const lead = await this.prisma.lead.create({
      data: {
        organizationId,
        ownerId,
        firstName,
        lastName,
        company: dto.company.trim(),
        title: dto.title?.trim() || undefined,
        email: dto.email?.trim() || undefined,
        phone: dto.phone?.trim() || undefined,
        website: dto.website?.trim() || undefined,
        industry: dto.industry?.trim() || undefined,
        description,
        source: WEBSITE_SOURCE,
        sourceDetail: WEBSITE_SOURCE_DETAIL,
        status: LeadStatus.NEW,
      },
    });

    await this.auditLogService.log({
      organizationId,
      userId: ownerId,
      action: AuditAction.CREATE,
      entityType: 'Lead',
      entityId: lead.id,
      newValues: lead,
    });

    return {
      message: SUCCESS_MESSAGE,
      leadId: lead.id,
    };
  }

  private validatePayload(dto: LeadCaptureDto): void {
    if (!dto.fullName?.trim()) {
      throw new BadRequestException('Vui lòng nhập họ và tên.');
    }

    if (!dto.company?.trim()) {
      throw new BadRequestException('Vui lòng nhập tên công ty.');
    }

    if (!dto.message?.trim()) {
      throw new BadRequestException('Vui lòng nhập nhu cầu tư vấn.');
    }

    if (!dto.email?.trim() && !dto.phone?.trim()) {
      throw new BadRequestException('Vui lòng nhập email hoặc số điện thoại.');
    }
  }

  private async assertPublicLeadTarget(organizationId: string, ownerId: string): Promise<void> {
    const [organization, owner] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true },
      }),
      this.prisma.user.findFirst({
        where: {
          id: ownerId,
          organizationId,
          deletedAt: null,
        },
        select: { id: true },
      }),
    ]);

    if (!organization || !owner) {
      throw new ServiceUnavailableException(
        'Cấu hình nhận Lead từ website không hợp lệ.',
      );
    }
  }

  private splitFullName(fullName: string): { firstName?: string; lastName: string } {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const lastName = parts.pop() || fullName.trim();
    const firstName = parts.length > 0 ? parts.join(' ') : undefined;

    return { firstName, lastName };
  }

  private buildDescription(dto: LeadCaptureDto): string {
    return [
      dto.message.trim(),
      dto.companySize?.trim() ? `Quy mô công ty: ${dto.companySize.trim()}` : null,
      dto.preferredContactTime?.trim()
        ? `Thời gian muốn được liên hệ: ${dto.preferredContactTime.trim()}`
        : null,
    ]
      .filter(Boolean)
      .join('\n');
  }
}
