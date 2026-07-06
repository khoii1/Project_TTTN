import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Prisma, UserRole } from '@prisma/client';
import { RoleGuard } from '../../shared/guards/role.guard';
import { RecycleBinController } from './recycle-bin.controller';
import { RecycleBinService } from './recycle-bin.service';

describe('RecycleBinService permanent delete', () => {
  const user = { sub: 'admin-1', organizationId: 'org-1' };
  const deletedAt = new Date('2026-07-06T00:00:00.000Z');

  const setup = () => {
    const tx = {
      lead: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'lead-1',
          organizationId: 'org-1',
          company: 'ACME',
          lastName: 'Nguyễn',
          convertedAccountId: 'account-converted',
          convertedContactId: 'contact-converted',
          convertedOpportunityId: 'opportunity-converted',
          deletedAt,
        }),
        delete: jest.fn().mockResolvedValue({ id: 'lead-1' }),
      },
      account: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'account-1',
          organizationId: 'org-1',
          name: 'ACME',
          deletedAt,
        }),
        delete: jest.fn().mockResolvedValue({ id: 'account-1' }),
      },
      contact: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'contact-1',
          organizationId: 'org-1',
          firstName: 'An',
          lastName: 'Nguyễn',
          deletedAt,
        }),
        count: jest.fn().mockResolvedValue(0),
        delete: jest.fn().mockResolvedValue({ id: 'contact-1' }),
      },
      opportunity: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'opportunity-1',
          organizationId: 'org-1',
          name: 'Cơ hội ACME',
          deletedAt,
        }),
        count: jest.fn().mockResolvedValue(0),
        delete: jest.fn().mockResolvedValue({ id: 'opportunity-1' }),
      },
      case: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'case-1',
          organizationId: 'org-1',
          subject: 'Yêu cầu hỗ trợ',
          deletedAt,
        }),
        count: jest.fn().mockResolvedValue(0),
        delete: jest.fn().mockResolvedValue({ id: 'case-1' }),
      },
      quote: { count: jest.fn().mockResolvedValue(0) },
      contract: { count: jest.fn().mockResolvedValue(0) },
      task: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'task-1',
          organizationId: 'org-1',
          subject: 'Gọi khách hàng',
          deletedAt,
        }),
        count: jest.fn().mockResolvedValue(0),
        delete: jest.fn().mockResolvedValue({ id: 'task-1' }),
      },
      note: { count: jest.fn().mockResolvedValue(0) },
      opportunityAttachment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      taskCommentAttachment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (callback) => callback(tx)),
    };
    const storage = {
      deleteFilesStrict: jest.fn().mockResolvedValue(undefined),
    };
    const service = new RecycleBinService(prisma as any, storage as any);
    return { service, prisma, storage, tx };
  };

  afterEach(() => jest.clearAllMocks());

  it('hard deletes a soft-deleted lead without deleting converted records', async () => {
    const { service, tx } = setup();
    await service.permanentDelete('lead', 'lead-1', user);

    expect(tx.lead.delete).toHaveBeenCalledWith({ where: { id: 'lead-1' } });
    expect(tx.account.delete).not.toHaveBeenCalled();
    expect(tx.contact.delete).not.toHaveBeenCalled();
    expect(tx.opportunity.delete).not.toHaveBeenCalled();
  });

  it('blocks a record that is not in the recycle bin', async () => {
    const { service, tx } = setup();
    tx.lead.findFirst.mockResolvedValue({
      id: 'lead-1',
      company: 'ACME',
      lastName: 'Nguyễn',
      deletedAt: null,
    });

    await expect(
      service.permanentDelete('lead', 'lead-1', user),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.lead.delete).not.toHaveBeenCalled();
  });

  it('returns not found for another tenant or missing ID', async () => {
    const { service, tx } = setup();
    tx.case.findFirst.mockResolvedValue(null);

    await expect(
      service.permanentDelete('case', 'case-other', user),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.case.findFirst).toHaveBeenCalledWith({
      where: { id: 'case-other', organizationId: 'org-1' },
    });
  });

  it('blocks lead deletion when polymorphic tasks or notes remain', async () => {
    const { service, tx } = setup();
    tx.task.count.mockResolvedValue(1);

    await expect(
      service.permanentDelete('lead', 'lead-1', user),
    ).rejects.toThrow('vẫn còn công việc hoặc ghi chú liên quan');
    expect(tx.lead.delete).not.toHaveBeenCalled();
  });

  it.each([
    ['contact', 'người liên hệ'],
    ['opportunity', 'cơ hội bán hàng'],
    ['case', 'yêu cầu hỗ trợ'],
    ['quote', 'tài liệu bán hàng'],
    ['contract', 'tài liệu bán hàng'],
    ['task', 'công việc'],
    ['note', 'ghi chú'],
  ])('blocks account deletion when %s records remain', async (relation) => {
    const { service, tx } = setup();
    (tx as any)[relation].count.mockResolvedValue(1);

    await expect(
      service.permanentDelete('account', 'account-1', user),
    ).rejects.toThrow('Không thể xóa vĩnh viễn khách hàng/công ty');
    expect(tx.account.delete).not.toHaveBeenCalled();
  });

  it('hard deletes contact without deleting account, opportunity or case', async () => {
    const { service, tx } = setup();
    await service.permanentDelete('contact', 'contact-1', user);

    expect(tx.contact.delete).toHaveBeenCalledWith({ where: { id: 'contact-1' } });
    expect(tx.account.delete).not.toHaveBeenCalled();
    expect(tx.opportunity.delete).not.toHaveBeenCalled();
    expect(tx.case.delete).not.toHaveBeenCalled();
  });

  it.each(['quote', 'contract'])(
    'blocks opportunity deletion when %s history remains',
    async (relation) => {
      const { service, tx } = setup();
      (tx as any)[relation].count.mockResolvedValue(1);

      await expect(
        service.permanentDelete('opportunity', 'opportunity-1', user),
      ).rejects.toThrow('vẫn còn báo giá hoặc hợp đồng');
      expect(tx.opportunity.delete).not.toHaveBeenCalled();
    },
  );

  it('deletes opportunity attachment files inside the transaction boundary', async () => {
    const { service, prisma, storage, tx } = setup();
    tx.opportunityAttachment.findMany.mockResolvedValue([
      { storagePath: 'organizations/org-1/opportunities/one.pdf' },
    ]);

    await service.permanentDelete('opportunity', 'opportunity-1', user);

    expect(tx.opportunity.delete).toHaveBeenCalled();
    expect(storage.deleteFilesStrict).toHaveBeenCalledWith([
      'organizations/org-1/opportunities/one.pdf',
    ]);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it('rolls back opportunity metadata deletion when Storage cleanup fails', async () => {
    const { service, storage, tx } = setup();
    tx.opportunityAttachment.findMany.mockResolvedValue([
      { storagePath: 'opportunity/file.pdf' },
    ]);
    storage.deleteFilesStrict.mockRejectedValue(
      new ServiceUnavailableException('storage unavailable'),
    );

    await expect(
      service.permanentDelete('opportunity', 'opportunity-1', user),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('deletes task comments/metadata by cascade and removes physical files', async () => {
    const { service, storage, tx } = setup();
    tx.taskCommentAttachment.findMany.mockResolvedValue([
      { storagePath: 'tasks/comment/file.png' },
    ]);

    await service.permanentDelete('task', 'task-1', user);

    expect(tx.task.delete).toHaveBeenCalledWith({ where: { id: 'task-1' } });
    expect(storage.deleteFilesStrict).toHaveBeenCalledWith([
      'tasks/comment/file.png',
    ]);
  });

  it('does not leave task metadata deleted when Storage cleanup fails', async () => {
    const { service, storage, tx } = setup();
    tx.taskCommentAttachment.findMany.mockResolvedValue([
      { storagePath: 'tasks/comment/file.png' },
    ]);
    storage.deleteFilesStrict.mockRejectedValue(
      new ServiceUnavailableException('storage unavailable'),
    );

    await expect(
      service.permanentDelete('task', 'task-1', user),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('hard deletes case without deleting its account or contact', async () => {
    const { service, tx } = setup();
    await service.permanentDelete('case', 'case-1', user);

    expect(tx.case.delete).toHaveBeenCalledWith({ where: { id: 'case-1' } });
    expect(tx.account.delete).not.toHaveBeenCalled();
    expect(tx.contact.delete).not.toHaveBeenCalled();
  });

  it('writes permanent-delete audit before deleting the entity', async () => {
    const { service, tx } = setup();
    await service.permanentDelete('task', 'task-1', user);

    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-1',
        userId: 'admin-1',
        action: 'PERMANENT_DELETE',
        entityType: 'Task',
        entityId: 'task-1',
        oldValues: { subject: 'Gọi khách hàng' },
      }),
    });
    expect(tx.auditLog.create.mock.invocationCallOrder[0]).toBeLessThan(
      tx.task.delete.mock.invocationCallOrder[0],
    );
  });

  it('converts raw foreign-key errors into a Vietnamese business error', async () => {
    const { service, tx } = setup();
    tx.contact.delete.mockRejectedValue({ code: 'P2003', message: 'raw FK error' });

    await expect(
      service.permanentDelete('contact', 'contact-1', user),
    ).rejects.toThrow('vẫn còn dữ liệu liên quan cần được bảo tồn');
  });
});

describe('RecycleBinController permission', () => {
  const guard = new RoleGuard(new Reflector());
  const handler = RecycleBinController.prototype.permanentDelete;
  const contextFor = (role: UserRole) =>
    ({
      getHandler: () => handler,
      switchToHttp: () => ({
        getRequest: () => ({ user: { role } }),
      }),
    }) as any;

  it('allows ADMIN to permanently delete', () => {
    expect(guard.canActivate(contextFor(UserRole.ADMIN))).toBe(true);
  });

  it.each([UserRole.MANAGER, UserRole.SALES, UserRole.SUPPORT])(
    'blocks %s from permanently deleting',
    (role) => {
      expect(() => guard.canActivate(contextFor(role))).toThrow(
        ForbiddenException,
      );
    },
  );
});
