import { Test, TestingModule } from '@nestjs/testing';
import { TaskStatus } from '@prisma/client';
import { AuditLogService, AuditAction } from '../src/infrastructure/audit/audit-log.service';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { TaskService } from '../src/modules/tasks/application/services/task.service';

describe('Task Action Tracking', () => {
  let service: TaskService;

  const mockPrismaService = {
    task: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
  };

  const mockAuditLogService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('complete task sets completedById and completedAt', async () => {
    const task = {
      id: 'task-1',
      organizationId: 'org-1',
      ownerId: 'owner-1',
      assignedToId: 'assignee-1',
      subject: 'Follow up',
      dueDate: null,
      status: TaskStatus.NOT_STARTED,
      priority: 'NORMAL',
      relatedType: 'LEAD',
      relatedId: 'lead-1',
      description: null,
      completedAt: null,
      completedById: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrismaService.task.findFirst.mockResolvedValue(task);
    mockPrismaService.task.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...task, ...data }),
    );

    const result = await service.completeTask('task-1', 'org-1', 'actor-1', {
      status: TaskStatus.COMPLETED,
    });

    expect(mockPrismaService.task.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: {
        status: TaskStatus.COMPLETED,
        completedAt: expect.any(Date),
        completedById: 'actor-1',
      },
    });
    expect(result.completedById).toBe('actor-1');
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(mockAuditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'actor-1',
        action: AuditAction.TASK_COMPLETION,
      }),
    );
  });
});
