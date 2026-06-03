import { BadRequestException } from '@nestjs/common';
import { AccountService } from '../src/modules/accounts/application/services/account.service';
import { CaseService } from '../src/modules/cases/application/services/case.service';
import { ContactService } from '../src/modules/contacts/application/services/contact.service';
import { LeadService } from '../src/modules/leads/application/services/lead.service';
import { OpportunityService } from '../src/modules/opportunities/application/services/opportunity.service';
import { TaskService } from '../src/modules/tasks/application/services/task.service';
import { assertCsvFile } from '../src/common/import-csv/import-csv.utils';

const ORG = 'org-1';
const USER = 'user-1';
const OTHER_ORG = 'org-2';

const csv = (text: string) => Buffer.from(text, 'utf8');
const auditLog = { log: jest.fn().mockResolvedValue(undefined) };
const leadAssignmentService = {
  resolveOwner: jest.fn(async ({ fallbackOwnerId }) => fallbackOwnerId),
  getLeadVisibilityWhere: jest.fn(() => ({})),
};

describe('CSV import', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('imports Lead CSV successfully and skips duplicate email', async () => {
    const prisma: any = {
      lead: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: 'existing-lead' }),
        create: jest.fn().mockResolvedValue({
          id: 'lead-1',
          organizationId: ORG,
          ownerId: USER,
          firstName: 'An',
          lastName: 'Nguyen',
          company: 'An Phat',
          email: 'an@example.com',
          status: 'NEW',
        }),
      },
    };
    const service = new LeadService(prisma, auditLog as any, leadAssignmentService as any);

    const result = await service.importCsv(
      ORG,
      USER,
      csv('firstName,lastName,company,email,status\nAn,Nguyen,An Phat,an@example.com,NEW\nBinh,Tran,Beta,an@example.com,NEW'),
    );

    expect(result.successCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(result.errors[0].type).toBe('SKIPPED');
    expect(prisma.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: ORG,
          ownerId: USER,
          source: 'IMPORT_CSV',
        }),
      }),
    );
  });

  it('imports Account CSV and skips duplicate name', async () => {
    const prisma: any = {
      account: {
        findFirst: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'acc-old' }),
        create: jest.fn().mockResolvedValue({
          id: 'acc-1',
          organizationId: ORG,
          ownerId: USER,
          name: 'Acme',
          type: 'Customer',
        }),
      },
    };
    const service = new AccountService(prisma, auditLog as any);

    const result = await service.importCsv(
      ORG,
      USER,
      csv('name,website,type\nAcme,https://acme.test,Customer\nAcme,https://old.test,Customer'),
    );

    expect(result.successCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(prisma.account.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: ORG,
        deletedAt: null,
        name: { equals: 'Acme', mode: 'insensitive' },
      },
    });
  });

  it('imports Contact CSV with accountName and rejects missing accountName', async () => {
    const prisma: any = {
      contact: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'contact-1',
          organizationId: ORG,
          ownerId: USER,
          accountId: 'acc-1',
          firstName: 'An',
          lastName: 'Nguyen',
        }),
      },
      account: {
        findMany: jest.fn().mockResolvedValueOnce([{ id: 'acc-1' }]).mockResolvedValueOnce([]),
      },
    };
    const service = new ContactService(prisma, auditLog as any);

    const result = await service.importCsv(
      ORG,
      USER,
      csv('firstName,lastName,email,accountName\nAn,Nguyen,an@example.com,Acme\nLan,Tran,lan@example.com,Missing'),
    );

    expect(result.successCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.errors[0].field).toBe('accountName');
    expect(prisma.account.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: ORG, deletedAt: null }),
      }),
    );
  });

  it('rejects Contact CSV when accountName is ambiguous', async () => {
    const prisma: any = {
      contact: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
      account: { findMany: jest.fn().mockResolvedValue([{ id: 'acc-1' }, { id: 'acc-2' }]) },
    };
    const service = new ContactService(prisma, auditLog as any);

    const result = await service.importCsv(
      ORG,
      USER,
      csv('lastName,email,accountName\nNguyen,an@example.com,Acme'),
    );

    expect(result.failedCount).toBe(1);
    expect(result.errors[0].message).toContain('Tim thay nhieu ban ghi trung');
  });

  it('imports Opportunity CSV with numeric amount and rejects invalid amount', async () => {
    const prisma: any = {
      account: { findMany: jest.fn().mockResolvedValue([{ id: 'acc-1' }]) },
      opportunity: {
        create: jest.fn().mockResolvedValue({
          id: 'opp-1',
          organizationId: ORG,
          ownerId: USER,
          accountId: 'acc-1',
          name: 'Deal',
          stage: 'QUALIFY',
          amount: { toString: () => '1000' },
        }),
      },
    };
    const service = new OpportunityService(prisma, auditLog as any);

    const result = await service.importCsv(
      ORG,
      USER,
      csv('name,amount,accountName\nDeal,1000,Acme\nBad,abc,Acme'),
    );

    expect(result.successCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.errors[0].field).toBe('amount');
  });

  it('imports Task CSV with relatedType and relatedName', async () => {
    const prisma: any = {
      user: { findFirst: jest.fn() },
      account: { findMany: jest.fn().mockResolvedValue([{ id: 'acc-1' }]) },
      task: {
        create: jest.fn().mockResolvedValue({
          id: 'task-1',
          organizationId: ORG,
          ownerId: USER,
          assignedToId: USER,
          subject: 'Call',
          status: 'NOT_STARTED',
          priority: 'NORMAL',
          relatedType: 'ACCOUNT',
          relatedId: 'acc-1',
        }),
      },
    };
    const service = new TaskService(prisma, auditLog as any);

    const result = await service.importCsv(
      ORG,
      USER,
      csv('subject,relatedType,relatedName\nCall,ACCOUNT,Acme'),
    );

    expect(result.successCount).toBe(1);
    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ relatedType: 'ACCOUNT', relatedId: 'acc-1' }),
      }),
    );
  });

  it('imports Case CSV with accountName', async () => {
    const prisma: any = {
      account: { findMany: jest.fn().mockResolvedValue([{ id: 'acc-1' }]) },
      case: {
        create: jest.fn().mockResolvedValue({
          id: 'case-1',
          organizationId: ORG,
          ownerId: USER,
          subject: 'Support',
          status: 'NEW',
          priority: 'MEDIUM',
          accountId: 'acc-1',
        }),
      },
    };
    const service = new CaseService(prisma, auditLog as any);

    const result = await service.importCsv(
      ORG,
      USER,
      csv('subject,priority,accountName\nSupport,HIGH,Acme'),
    );

    expect(result.successCount).toBe(1);
    expect(prisma.case.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: ORG, accountId: 'acc-1' }),
      }),
    );
  });

  it('rejects non-CSV files', () => {
    expect(() =>
      assertCsvFile({
        originalname: 'leads.txt',
        size: 10,
        buffer: Buffer.from('hello'),
      }),
    ).toThrow(BadRequestException);
  });

  it('does not resolve cross-organization account IDs during Contact import', async () => {
    const prisma: any = {
      contact: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
      account: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new ContactService(prisma, auditLog as any);

    const result = await service.importCsv(
      ORG,
      USER,
      csv('lastName,email,accountId\nNguyen,an@example.com,acc-other-org'),
    );

    expect(result.failedCount).toBe(1);
    expect(prisma.account.findFirst).toHaveBeenCalledWith({
      where: { id: 'acc-other-org', organizationId: ORG, deletedAt: null },
    });
    expect(OTHER_ORG).toBe('org-2');
  });
});
