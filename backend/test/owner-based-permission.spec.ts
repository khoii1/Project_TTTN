import { AccountService } from '../src/modules/accounts/application/services/account.service';
import { ContactService } from '../src/modules/contacts/application/services/contact.service';
import { OpportunityService } from '../src/modules/opportunities/application/services/opportunity.service';
import { TaskService } from '../src/modules/tasks/application/services/task.service';
import { CaseService } from '../src/modules/cases/application/services/case.service';
import { DashboardService } from '../src/modules/dashboard/application/services/dashboard.service';

const organizationId = 'org-1';
const salesUser = { sub: 'sales-1', role: 'SALES' };
const adminUser = { sub: 'admin-1', role: 'ADMIN' };
const auditLog = { log: jest.fn() };

const paginatedEntity = (record: Record<string, unknown> = {}) => ({
  findMany: jest.fn().mockResolvedValue([]),
  count: jest.fn().mockResolvedValue(0),
  findFirst: jest.fn().mockResolvedValue({
    id: 'record-1',
    organizationId,
    ownerId: salesUser.sub,
    deletedAt: null,
    name: 'Record',
    subject: 'Record',
    lastName: 'Record',
    ...record,
  }),
  update: jest.fn().mockImplementation(({ data }) =>
    Promise.resolve({
      id: 'record-1',
      organizationId,
      ownerId: salesUser.sub,
      deletedAt: null,
      name: 'Record',
      subject: 'Record',
      lastName: 'Record',
      ...record,
      ...data,
    }),
  ),
});

describe('Owner-based permission scopes', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['Account', () => {
      const prisma = { account: paginatedEntity() };
      return { prisma, run: () => new AccountService(prisma as any, auditLog as any).findAll(organizationId, 1, 10, undefined, undefined, false, salesUser) };
    }, 'account'],
    ['Contact', () => {
      const prisma = { contact: paginatedEntity() };
      return { prisma, run: () => new ContactService(prisma as any, auditLog as any).findAll(organizationId, 1, 10, undefined, undefined, false, undefined, salesUser) };
    }, 'contact'],
    ['Opportunity', () => {
      const prisma = { opportunity: paginatedEntity() };
      return { prisma, run: () => new OpportunityService(prisma as any, auditLog as any).findAll(organizationId, 1, 10, undefined, undefined, undefined, false, undefined, undefined, salesUser) };
    }, 'opportunity'],
    ['Case', () => {
      const prisma = { case: paginatedEntity() };
      return { prisma, run: () => new CaseService(prisma as any, auditLog as any).findAll(organizationId, 1, 10, undefined, undefined, undefined, undefined, false, undefined, undefined, salesUser) };
    }, 'case'],
  ])('%s list adds ownerId for Sales', async (_name, factory, entityName) => {
    const { prisma, run } = factory();

    await run();

    expect((prisma as any)[entityName].findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId,
          ownerId: salesUser.sub,
          deletedAt: null,
        }),
      }),
    );
  });

  it('Admin account list is organization-scoped without ownerId', async () => {
    const prisma = { account: paginatedEntity() };
    await new AccountService(prisma as any, auditLog as any).findAll(
      organizationId,
      1,
      10,
      undefined,
      undefined,
      false,
      adminUser,
    );

    expect(prisma.account.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ ownerId: expect.any(String) }),
      }),
    );
  });

  it('Task list scopes Sales to owner or assignee', async () => {
    const prisma = { task: paginatedEntity({ assignedToId: salesUser.sub }) };

    await new TaskService(prisma as any, auditLog as any).findAll(
      organizationId,
      1,
      10,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      false,
      salesUser,
    );

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId,
          OR: [{ ownerId: salesUser.sub }, { assignedToId: salesUser.sub }],
        }),
      }),
    );
  });

  it('Dashboard summary scopes non-lead modules for Sales', async () => {
    const aggregate = jest.fn().mockResolvedValue({ _sum: { amount: 0 } });
    const prisma = {
      lead: { count: jest.fn().mockResolvedValue(0) },
      account: { count: jest.fn().mockResolvedValue(0) },
      contact: { count: jest.fn().mockResolvedValue(0) },
      opportunity: {
        count: jest.fn().mockResolvedValue(0),
        aggregate,
      },
      task: { count: jest.fn().mockResolvedValue(0) },
      case: { count: jest.fn().mockResolvedValue(0) },
    };

    await new DashboardService(prisma as any).getSummary(organizationId, salesUser);

    expect(prisma.account.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ ownerId: salesUser.sub }),
    });
    expect(prisma.opportunity.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ ownerId: salesUser.sub }),
    });
    expect(prisma.task.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        OR: [{ ownerId: salesUser.sub }, { assignedToId: salesUser.sub }],
      }),
    });
    expect(prisma.case.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ ownerId: salesUser.sub }),
    });
  });
});
