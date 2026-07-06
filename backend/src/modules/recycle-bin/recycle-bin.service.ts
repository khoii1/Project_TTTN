import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditAction } from '../../infrastructure/audit/audit-log.service';
import { StorageService } from '../../shared/storage/storage.service';
import { PermanentDeleteEntity } from './recycle-bin.types';

type DeleteUser = {
  sub: string;
  organizationId: string;
};

@Injectable()
export class RecycleBinService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  async permanentDelete(
    entity: PermanentDeleteEntity,
    id: string,
    user: DeleteUser,
  ): Promise<{ message: string }> {
    try {
      await this.prisma.$transaction(
        async (tx) => {
          switch (entity) {
            case 'lead':
              await this.deleteLead(tx, id, user);
              break;
            case 'account':
              await this.deleteAccount(tx, id, user);
              break;
            case 'contact':
              await this.deleteContact(tx, id, user);
              break;
            case 'opportunity':
              await this.deleteOpportunity(tx, id, user);
              break;
            case 'task':
              await this.deleteTask(tx, id, user);
              break;
            case 'case':
              await this.deleteCase(tx, id, user);
              break;
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === 'P2025') {
        throw new NotFoundException('Không tìm thấy bản ghi trong Thùng rác.');
      }
      if (code === 'P2003') {
        throw new BadRequestException(
          'Không thể xóa vĩnh viễn vì bản ghi vẫn còn dữ liệu liên quan cần được bảo tồn.',
        );
      }
      if (code === 'P2034') {
        throw new BadRequestException(
          'Dữ liệu vừa thay đổi. Vui lòng tải lại Thùng rác và thử lại.',
        );
      }
      throw error;
    }

    return { message: 'Đã xóa vĩnh viễn bản ghi.' };
  }

  private async deleteLead(
    tx: Prisma.TransactionClient,
    id: string,
    user: DeleteUser,
  ) {
    const lead = await tx.lead.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    this.assertDeleted(lead, 'khách hàng tiềm năng');
    await this.assertNoPolymorphicReferences(
      tx,
      user.organizationId,
      'LEAD',
      id,
      'khách hàng tiềm năng',
    );
    await this.createAudit(tx, user, 'Lead', id, {
      company: lead.company,
      lastName: lead.lastName,
      convertedAccountId: lead.convertedAccountId,
      convertedContactId: lead.convertedContactId,
      convertedOpportunityId: lead.convertedOpportunityId,
    });
    await tx.lead.delete({ where: { id } });
  }

  private async deleteAccount(
    tx: Prisma.TransactionClient,
    id: string,
    user: DeleteUser,
  ) {
    const account = await tx.account.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    this.assertDeleted(account, 'khách hàng/công ty');

    const [contacts, opportunities, cases, quotes, contracts, tasks, notes] =
      await Promise.all([
        tx.contact.count({ where: { accountId: id } }),
        tx.opportunity.count({ where: { accountId: id } }),
        tx.case.count({ where: { accountId: id } }),
        tx.quote.count({ where: { accountId: id } }),
        tx.contract.count({ where: { accountId: id } }),
        tx.task.count({
          where: {
            organizationId: user.organizationId,
            relatedType: 'ACCOUNT',
            relatedId: id,
          },
        }),
        tx.note.count({
          where: {
            organizationId: user.organizationId,
            relatedType: 'ACCOUNT',
            relatedId: id,
          },
        }),
      ]);

    if (contacts + opportunities + cases + quotes + contracts + tasks + notes > 0) {
      throw new BadRequestException(
        'Không thể xóa vĩnh viễn khách hàng/công ty vì vẫn còn người liên hệ, cơ hội bán hàng, yêu cầu hỗ trợ, công việc, ghi chú hoặc tài liệu bán hàng liên quan.',
      );
    }

    await this.createAudit(tx, user, 'Account', id, { name: account.name });
    await tx.account.delete({ where: { id } });
  }

  private async deleteContact(
    tx: Prisma.TransactionClient,
    id: string,
    user: DeleteUser,
  ) {
    const contact = await tx.contact.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    this.assertDeleted(contact, 'người liên hệ');
    await this.assertNoPolymorphicReferences(
      tx,
      user.organizationId,
      'CONTACT',
      id,
      'người liên hệ',
    );
    await this.createAudit(tx, user, 'Contact', id, {
      firstName: contact.firstName,
      lastName: contact.lastName,
    });
    await tx.contact.delete({ where: { id } });
  }

  private async deleteOpportunity(
    tx: Prisma.TransactionClient,
    id: string,
    user: DeleteUser,
  ) {
    const opportunity = await tx.opportunity.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    this.assertDeleted(opportunity, 'cơ hội bán hàng');

    const [quoteCount, contractCount] = await Promise.all([
      tx.quote.count({ where: { opportunityId: id } }),
      tx.contract.count({ where: { opportunityId: id } }),
    ]);
    if (quoteCount + contractCount > 0) {
      throw new BadRequestException(
        'Không thể xóa vĩnh viễn cơ hội bán hàng vì vẫn còn báo giá hoặc hợp đồng cần được bảo tồn.',
      );
    }
    await this.assertNoPolymorphicReferences(
      tx,
      user.organizationId,
      'OPPORTUNITY',
      id,
      'cơ hội bán hàng',
    );

    const attachments = await tx.opportunityAttachment.findMany({
      where: { opportunityId: id, organizationId: user.organizationId },
      select: { storagePath: true },
    });
    await this.createAudit(tx, user, 'Opportunity', id, {
      name: opportunity.name,
    });
    await tx.opportunity.delete({ where: { id } });
    await this.storageService.deleteFilesStrict(
      attachments.map((item) => item.storagePath),
    );
  }

  private async deleteTask(
    tx: Prisma.TransactionClient,
    id: string,
    user: DeleteUser,
  ) {
    const task = await tx.task.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    this.assertDeleted(task, 'công việc');
    await this.assertNoPolymorphicReferences(
      tx,
      user.organizationId,
      'TASK',
      id,
      'công việc',
    );

    const attachments = await tx.taskCommentAttachment.findMany({
      where: { taskId: id, organizationId: user.organizationId },
      select: { storagePath: true },
    });
    await this.createAudit(tx, user, 'Task', id, { subject: task.subject });
    await tx.task.delete({ where: { id } });
    await this.storageService.deleteFilesStrict(
      attachments.map((item) => item.storagePath),
    );
  }

  private async deleteCase(
    tx: Prisma.TransactionClient,
    id: string,
    user: DeleteUser,
  ) {
    const crmCase = await tx.case.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    this.assertDeleted(crmCase, 'yêu cầu hỗ trợ');
    await this.assertNoPolymorphicReferences(
      tx,
      user.organizationId,
      'CASE',
      id,
      'yêu cầu hỗ trợ',
    );
    await this.createAudit(tx, user, 'Case', id, {
      subject: crmCase.subject,
    });
    await tx.case.delete({ where: { id } });
  }

  private assertDeleted<T extends { deletedAt: Date | null }>(
    record: T | null,
    label: string,
  ): asserts record is T {
    if (!record) {
      throw new NotFoundException(`Không tìm thấy ${label} trong Thùng rác.`);
    }
    if (!record.deletedAt) {
      throw new BadRequestException(
        `Chỉ có thể xóa vĩnh viễn ${label} đã nằm trong Thùng rác.`,
      );
    }
  }

  private async assertNoPolymorphicReferences(
    tx: Prisma.TransactionClient,
    organizationId: string,
    relatedType: string,
    relatedId: string,
    label: string,
  ) {
    const [tasks, notes] = await Promise.all([
      tx.task.count({
        where: { organizationId, relatedType, relatedId },
      }),
      tx.note.count({
        where: { organizationId, relatedType, relatedId },
      }),
    ]);
    if (tasks + notes > 0) {
      throw new BadRequestException(
        `Không thể xóa vĩnh viễn ${label} vì vẫn còn công việc hoặc ghi chú liên quan.`,
      );
    }
  }

  private createAudit(
    tx: Prisma.TransactionClient,
    user: DeleteUser,
    entityType: string,
    entityId: string,
    snapshot: Record<string, unknown>,
  ) {
    return tx.auditLog.create({
      data: {
        id: randomUUID(),
        organizationId: user.organizationId,
        userId: user.sub,
        action: AuditAction.PERMANENT_DELETE,
        entityType,
        entityId,
        oldValues: snapshot as Prisma.InputJsonValue,
      },
    });
  }
}
