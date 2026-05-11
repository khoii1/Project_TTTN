import { DashboardService } from '../src/modules/dashboard/application/services/dashboard.service';
import {
  CasePriority,
  LeadStatus,
  OpportunityStage,
  TaskPriority,
  TaskStatus,
} from '@prisma/client';

describe('DashboardService', () => {
  const organizationId = 'org-1';
  let prisma: any;
  let service: DashboardService;

  beforeEach(() => {
    prisma = {
      lead: {
        count: jest.fn().mockResolvedValue(10),
        groupBy: jest.fn().mockResolvedValue([
          { status: LeadStatus.NEW, _count: { _all: 4 } },
          { status: LeadStatus.CONVERTED, _count: { _all: 2 } },
        ]),
      },
      account: { count: jest.fn().mockResolvedValue(3) },
      contact: { count: jest.fn().mockResolvedValue(7) },
      opportunity: {
        count: jest.fn().mockResolvedValue(5),
        aggregate: jest
          .fn()
          .mockResolvedValueOnce({ _sum: { amount: { toString: () => '25000' } } })
          .mockResolvedValueOnce({ _sum: { amount: { toString: () => '9000' } } }),
        groupBy: jest.fn().mockResolvedValue([
          {
            stage: OpportunityStage.QUALIFY,
            _count: { _all: 2 },
            _sum: { amount: { toString: () => '10000' } },
          },
          {
            stage: OpportunityStage.CLOSED_WON,
            _count: { _all: 1 },
            _sum: { amount: { toString: () => '9000' } },
          },
        ]),
      },
      task: {
        count: jest.fn().mockResolvedValueOnce(6).mockResolvedValueOnce(2),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'task-1',
            subject: 'Follow up',
            dueDate: new Date('2026-05-10T00:00:00.000Z'),
            status: TaskStatus.NOT_STARTED,
            priority: TaskPriority.HIGH,
            createdAt: new Date('2026-05-01T00:00:00.000Z'),
          },
        ]),
      },
      case: {
        count: jest.fn().mockResolvedValue(4),
        groupBy: jest
          .fn()
          .mockResolvedValue([{ priority: CasePriority.HIGH, _count: { _all: 2 } }]),
      },
    };

    service = new DashboardService(prisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns summary metrics scoped to organization and active records', async () => {
    const result = await service.getSummary(organizationId);

    expect(result).toEqual(
      expect.objectContaining({
        totalLeads: 10,
        totalAccounts: 3,
        totalContacts: 7,
        totalOpportunities: 5,
        openOpportunitiesValue: 25000,
        closedWonValue: 9000,
        openTasks: 6,
        overdueTasks: 2,
        openCases: 4,
      })
    );
    expect(prisma.lead.count).toHaveBeenCalledWith({
      where: { organizationId, deletedAt: null },
    });
    expect(prisma.opportunity.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId,
          deletedAt: null,
          stage: {
            in: [OpportunityStage.QUALIFY, OpportunityStage.PROPOSE, OpportunityStage.NEGOTIATE],
          },
        }),
      })
    );
    expect(prisma.task.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId,
          deletedAt: null,
          status: { in: [TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS] },
        }),
      })
    );
  });

  it('returns lead status groups including zero-count statuses', async () => {
    const result = await service.getLeadsByStatus(organizationId);

    expect(prisma.lead.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['status'],
        where: { organizationId, deletedAt: null },
      })
    );
    expect(result.find((item) => item.status === LeadStatus.NEW)?.count).toBe(4);
    expect(result.find((item) => item.status === LeadStatus.QUALIFIED)?.count).toBe(0);
  });

  it('returns opportunity stage groups with summed amounts', async () => {
    const result = await service.getOpportunitiesByStage(organizationId);

    expect(prisma.opportunity.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['stage'],
        where: { organizationId, deletedAt: null },
        _sum: { amount: true },
      })
    );
    expect(result.find((item) => item.stage === OpportunityStage.QUALIFY)?.amount).toBe(10000);
    expect(result.find((item) => item.stage === OpportunityStage.PROPOSE)?.amount).toBe(0);
  });

  it('returns case priority groups including zero-count priorities', async () => {
    const result = await service.getCasesByPriority(organizationId);

    expect(prisma.case.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['priority'],
        where: { organizationId, deletedAt: null },
      })
    );
    expect(result.find((item) => item.priority === CasePriority.HIGH)?.count).toBe(2);
    expect(result.find((item) => item.priority === CasePriority.URGENT)?.count).toBe(0);
  });

  it('returns upcoming active tasks scoped to organization', async () => {
    const result = await service.getUpcomingTasks(organizationId, 5);

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId,
          deletedAt: null,
          status: { in: [TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS] },
        }),
        orderBy: { dueDate: 'asc' },
        take: 5,
      })
    );
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'task-1',
        subject: 'Follow up',
        status: TaskStatus.NOT_STARTED,
        priority: TaskPriority.HIGH,
      })
    );
  });
});
