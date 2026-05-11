import { Test, TestingModule } from '@nestjs/testing';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { AuditAction, AuditLogService } from '../src/infrastructure/audit/audit-log.service';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { AccountService } from '../src/modules/accounts/application/services/account.service';
import { LeadService } from '../src/modules/leads/application/services/lead.service';
import { TaskService } from '../src/modules/tasks/application/services/task.service';

describe('Recycle Bin Action Tracking', () => {
  const organizationId = 'org-1';
  const actorId = 'actor-1';

  const mockAuditLogService = {
    log: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delete Lead sets deletedById and deletedAt', async () => {
    const lead = {
      id: 'lead-1',
      organizationId,
      ownerId: 'owner-1',
      firstName: 'Jane',
      lastName: 'Doe',
      company: 'Acme',
      status: 'NEW',
      deletedAt: null,
    };

    const mockPrismaService = {
      lead: {
        findFirst: jest.fn().mockResolvedValue(lead),
        update: jest.fn().mockResolvedValue({ ...lead, deletedAt: new Date(), deletedById: actorId }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    await module.get<LeadService>(LeadService).delete('lead-1', organizationId, actorId);

    expect(mockPrismaService.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: { deletedAt: expect.any(Date), deletedById: actorId },
    });
    expect(mockAuditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: actorId,
        action: AuditAction.SOFT_DELETE,
      }),
    );
  });

  it('restore Lead sets restoredById/restoredAt and clears deletedAt', async () => {
    const lead = {
      id: 'lead-1',
      organizationId,
      ownerId: 'owner-1',
      firstName: 'Jane',
      lastName: 'Doe',
      company: 'Acme',
      status: 'NEW',
      deletedAt: new Date(),
      deletedById: 'deleter-1',
      restoredAt: null,
      restoredById: null,
    };

    const mockPrismaService = {
      lead: {
        findFirst: jest.fn().mockResolvedValue(lead),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...lead, ...data }),
        ),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    const result = await module
      .get<LeadService>(LeadService)
      .restore('lead-1', organizationId, actorId);

    expect(mockPrismaService.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: {
        deletedAt: null,
        restoredAt: expect.any(Date),
        restoredById: actorId,
      },
    });
    expect(result.deletedAt).toBeNull();
    expect(result.deletedById).toBe('deleter-1');
    expect(result.restoredById).toBe(actorId);
  });

  it('delete and restore Task track deleter and restorer', async () => {
    const deletedAt = new Date();
    const task = {
      id: 'task-1',
      organizationId,
      ownerId: 'owner-1',
      assignedToId: 'assignee-1',
      subject: 'Follow up',
      dueDate: null,
      status: TaskStatus.NOT_STARTED,
      priority: TaskPriority.NORMAL,
      relatedType: null,
      relatedId: null,
      description: null,
      completedAt: null,
      completedById: null,
      deletedAt: null,
      deletedById: null,
      restoredAt: null,
      restoredById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPrismaService = {
      task: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(task)
          .mockResolvedValueOnce({ ...task, deletedAt, deletedById: actorId }),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...task, ...data }),
        ),
      },
      user: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    const service = module.get<TaskService>(TaskService);
    await service.delete('task-1', organizationId, actorId);
    await service.restore('task-1', organizationId, actorId);

    expect(mockPrismaService.task.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'task-1' },
      data: { deletedAt: expect.any(Date), deletedById: actorId },
    });
    expect(mockPrismaService.task.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'task-1' },
      data: {
        deletedAt: null,
        restoredAt: expect.any(Date),
        restoredById: actorId,
      },
    });
  });

  it('delete Account sets deletedById and deletedAt', async () => {
    const account = {
      id: 'account-1',
      organizationId,
      ownerId: 'owner-1',
      name: 'Acme',
      deletedAt: null,
    };

    const mockPrismaService = {
      account: {
        findFirst: jest.fn().mockResolvedValue(account),
        update: jest
          .fn()
          .mockResolvedValue({ ...account, deletedAt: new Date(), deletedById: actorId }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    await module.get<AccountService>(AccountService).delete('account-1', organizationId, actorId);

    expect(mockPrismaService.account.update).toHaveBeenCalledWith({
      where: { id: 'account-1' },
      data: { deletedAt: expect.any(Date), deletedById: actorId },
    });
  });
});
