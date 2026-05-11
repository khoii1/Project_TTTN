import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LeadService } from '../src/modules/leads/application/services/lead.service';
import { AccountService } from '../src/modules/accounts/application/services/account.service';
import { ContactService } from '../src/modules/contacts/application/services/contact.service';
import { OpportunityService } from '../src/modules/opportunities/application/services/opportunity.service';
import { TaskService } from '../src/modules/tasks/application/services/task.service';
import { NoteService } from '../src/modules/notes/application/services/note.service';
import { CaseService } from '../src/modules/cases/application/services/case.service';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { AuditLogService } from '../src/infrastructure/audit/audit-log.service';

/**
 * Organization Isolation Tests
 *
 * These tests prove that a user from Organization A cannot
 * read, update, or delete records belonging to Organization B.
 *
 * The pattern: each service uses `findFirst({ where: { id, organizationId } })`
 * so passing the wrong organizationId returns null → NotFoundException.
 */

const ORG_A = 'org-a-id';
const ORG_B = 'org-b-id';
const USER_A = 'user-a-id';

const mockAuditLogService = { log: jest.fn() };

// ---------- Helper to build a mock PrismaService for a single entity ----------
function buildMockPrisma(entityName: string, entityRecords: Record<string, any>[]) {
  const matchesDeletedAt = (record: Record<string, any>, where: Record<string, any>) => {
    if (!Object.prototype.hasOwnProperty.call(where, 'deletedAt')) {
      return true;
    }

    if (where.deletedAt === null) {
      return !record.deletedAt;
    }

    if (where.deletedAt?.not === null) {
      return !!record.deletedAt;
    }

    return true;
  };

  const findFirst = jest.fn().mockImplementation(({ where }) => {
    // Simulate Prisma's findFirst: match id AND organizationId AND deletedAt
    return Promise.resolve(
      entityRecords.find(
        (r) =>
          r.id === where.id &&
          r.organizationId === where.organizationId &&
          matchesDeletedAt(r, where),
      ) || null,
    );
  });

  const findMany = jest.fn().mockImplementation(({ where }) => {
    return Promise.resolve(
      entityRecords.filter(
        (r) =>
          r.organizationId === where.organizationId &&
          matchesDeletedAt(r, where) &&
          Object.entries(where).every(([key, value]) => {
            if (key === 'organizationId' || key === 'deletedAt' || key === 'OR') {
              return true;
            }
            if (typeof value === 'string') {
              return r[key] === value;
            }
            return true;
          }),
      ),
    );
  });

  const count = jest.fn().mockImplementation(({ where }) => {
    return Promise.resolve(
      entityRecords.filter(
        (r) =>
          r.organizationId === where.organizationId &&
          matchesDeletedAt(r, where) &&
          Object.entries(where).every(([key, value]) => {
            if (key === 'organizationId' || key === 'deletedAt' || key === 'OR') {
              return true;
            }
            if (typeof value === 'string') {
              return r[key] === value;
            }
            return true;
          }),
      ).length,
    );
  });

  const update = jest.fn().mockImplementation(({ where, data }) => {
    const record = entityRecords.find((r) => r.id === where.id);
    return Promise.resolve({ ...record, ...data });
  });

  return {
    [entityName]: { findFirst, findMany, count, update },
    user: { findFirst: jest.fn().mockResolvedValue({ id: USER_A, organizationId: ORG_A }) },
  };
}

// ---------- LEAD ISOLATION ----------
describe('Organization Isolation — Lead', () => {
  let service: LeadService;

  const leadOrgA = {
    id: 'lead-1', organizationId: ORG_A, ownerId: USER_A,
    firstName: 'Alice', lastName: 'Smith', company: 'OrgA Co', status: 'NEW',
    deletedAt: null,
  };
  const leadOrgB = {
    id: 'lead-2', organizationId: ORG_B, ownerId: 'user-b',
    firstName: 'Bob', lastName: 'Jones', company: 'OrgB Co', status: 'NEW',
    deletedAt: null,
  };

  beforeEach(async () => {
    const mockPrisma = buildMockPrisma('lead', [leadOrgA, leadOrgB]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();
    service = module.get<LeadService>(LeadService);
  });

  it('Org A user can read Org A lead', async () => {
    const result = await service.findById('lead-1', ORG_A);
    expect(result.id).toBe('lead-1');
  });

  it('Org A user CANNOT read Org B lead', async () => {
    await expect(service.findById('lead-2', ORG_A)).rejects.toThrow(NotFoundException);
  });

  it('Org A user CANNOT update Org B lead', async () => {
    await expect(service.update('lead-2', ORG_A, { lastName: 'Hacked' })).rejects.toThrow(NotFoundException);
  });

  it('Org A user CANNOT delete Org B lead', async () => {
    await expect(service.delete('lead-2', ORG_A, USER_A)).rejects.toThrow(NotFoundException);
  });

  it('findAll only returns Org A records', async () => {
    const result = await service.findAll(ORG_A, 1, 10);
    expect(result.data.length).toBe(1);
    expect(result.data[0].id).toBe('lead-1');
  });
});

// ---------- ACCOUNT ISOLATION ----------
describe('Organization Isolation — Account', () => {
  let service: AccountService;

  const accountOrgA = {
    id: 'acc-1', organizationId: ORG_A, ownerId: USER_A, name: 'OrgA Account', deletedAt: null,
  };
  const accountOrgB = {
    id: 'acc-2', organizationId: ORG_B, ownerId: 'user-b', name: 'OrgB Account', deletedAt: null,
  };

  beforeEach(async () => {
    const mockPrisma = buildMockPrisma('account', [accountOrgA, accountOrgB]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();
    service = module.get<AccountService>(AccountService);
  });

  it('Org A user can read Org A account', async () => {
    const result = await service.findById('acc-1', ORG_A);
    expect(result.id).toBe('acc-1');
  });

  it('Org A user CANNOT read Org B account', async () => {
    await expect(service.findById('acc-2', ORG_A)).rejects.toThrow(NotFoundException);
  });

  it('Org A user CANNOT update Org B account', async () => {
    await expect(service.update('acc-2', ORG_A, { name: 'Hacked' })).rejects.toThrow(NotFoundException);
  });

  it('Org A user CANNOT delete Org B account', async () => {
    await expect(service.delete('acc-2', ORG_A, USER_A)).rejects.toThrow(NotFoundException);
  });

  it('findAll only returns Org A records', async () => {
    const result = await service.findAll(ORG_A, 1, 10);
    expect(result.data.length).toBe(1);
    expect(result.data[0].id).toBe('acc-1');
  });
});

// ---------- CONTACT ISOLATION ----------
describe('Organization Isolation — Contact', () => {
  let service: ContactService;

  const contactOrgA = {
    id: 'con-1', organizationId: ORG_A, ownerId: USER_A, accountId: 'acc-1',
    firstName: 'A', lastName: 'Contact', deletedAt: null,
  };
  const contactOrgB = {
    id: 'con-2', organizationId: ORG_B, ownerId: 'user-b', accountId: 'acc-2',
    firstName: 'B', lastName: 'Contact', deletedAt: null,
  };

  beforeEach(async () => {
    const mockPrisma = buildMockPrisma('contact', [contactOrgA, contactOrgB]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();
    service = module.get<ContactService>(ContactService);
  });

  it('Org A user can read Org A contact', async () => {
    const result = await service.findById('con-1', ORG_A);
    expect(result.id).toBe('con-1');
  });

  it('Org A user CANNOT read Org B contact', async () => {
    await expect(service.findById('con-2', ORG_A)).rejects.toThrow(NotFoundException);
  });

  it('Org A user CANNOT update Org B contact', async () => {
    await expect(service.update('con-2', ORG_A, { lastName: 'Hacked' })).rejects.toThrow(NotFoundException);
  });

  it('Org A user CANNOT delete Org B contact', async () => {
    await expect(service.delete('con-2', ORG_A, USER_A)).rejects.toThrow(NotFoundException);
  });

  it('findAll only returns Org A records', async () => {
    const result = await service.findAll(ORG_A, 1, 10);
    expect(result.data.length).toBe(1);
    expect(result.data[0].id).toBe('con-1');
  });
});

// ---------- OPPORTUNITY ISOLATION ----------
describe('Organization Isolation — Opportunity', () => {
  let service: OpportunityService;

  const oppOrgA = {
    id: 'opp-1', organizationId: ORG_A, ownerId: USER_A, accountId: 'acc-1',
    name: 'OrgA Deal', stage: 'QUALIFY', amount: null, deletedAt: null,
  };
  const oppOrgB = {
    id: 'opp-2', organizationId: ORG_B, ownerId: 'user-b', accountId: 'acc-2',
    name: 'OrgB Deal', stage: 'PROPOSE', amount: null, deletedAt: null,
  };

  beforeEach(async () => {
    const mockPrisma = buildMockPrisma('opportunity', [oppOrgA, oppOrgB]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpportunityService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();
    service = module.get<OpportunityService>(OpportunityService);
  });

  it('Org A user can read Org A opportunity', async () => {
    const result = await service.findById('opp-1', ORG_A);
    expect(result.id).toBe('opp-1');
  });

  it('Org A user CANNOT read Org B opportunity', async () => {
    await expect(service.findById('opp-2', ORG_A)).rejects.toThrow(NotFoundException);
  });

  it('Org A user CANNOT update Org B opportunity', async () => {
    await expect(service.update('opp-2', ORG_A, { name: 'Hacked' })).rejects.toThrow(NotFoundException);
  });

  it('Org A user CANNOT delete Org B opportunity', async () => {
    await expect(service.delete('opp-2', ORG_A, USER_A)).rejects.toThrow(NotFoundException);
  });

  it('findAll only returns Org A records', async () => {
    const result = await service.findAll(ORG_A, 1, 10);
    expect(result.data.length).toBe(1);
    expect(result.data[0].id).toBe('opp-1');
  });
});

// ---------- TASK ISOLATION ----------
describe('Organization Isolation — Task', () => {
  let service: TaskService;

  const taskOrgA = {
    id: 'task-1', organizationId: ORG_A, ownerId: USER_A, assignedToId: USER_A,
    subject: 'OrgA Task', status: 'NOT_STARTED', priority: 'NORMAL',
    relatedType: 'LEAD', relatedId: 'lead-1', deletedAt: null,
  };
  const taskOrgB = {
    id: 'task-2', organizationId: ORG_B, ownerId: 'user-b', assignedToId: 'user-b',
    subject: 'OrgB Task', status: 'NOT_STARTED', priority: 'HIGH',
    relatedType: 'LEAD', relatedId: 'lead-2', deletedAt: null,
  };
  const deletedTaskOrgA = {
    id: 'task-3', organizationId: ORG_A, ownerId: USER_A, assignedToId: USER_A,
    subject: 'Deleted OrgA Task', status: 'NOT_STARTED', priority: 'NORMAL', deletedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = buildMockPrisma('task', [taskOrgA, taskOrgB, deletedTaskOrgA]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();
    service = module.get<TaskService>(TaskService);
  });

  it('Org A user can read Org A task', async () => {
    const result = await service.findById('task-1', ORG_A);
    expect(result.id).toBe('task-1');
  });

  it('Org A user CANNOT read Org B task', async () => {
    await expect(service.findById('task-2', ORG_A)).rejects.toThrow(NotFoundException);
  });

  it('Org A user CANNOT update Org B task', async () => {
    await expect(service.update('task-2', ORG_A, { subject: 'Hacked' })).rejects.toThrow(NotFoundException);
  });

  it('Org A user CANNOT delete Org B task', async () => {
    await expect(service.delete('task-2', ORG_A, USER_A)).rejects.toThrow(NotFoundException);
  });

  it('findAll only returns Org A records', async () => {
    const result = await service.findAll(ORG_A, 1, 10);
    expect(result.data.length).toBe(1);
    expect(result.data[0].id).toBe('task-1');
  });

  it('findAll can filter Org A tasks by related type and related id', async () => {
    const result = await service.findAll(
      ORG_A,
      1,
      10,
      undefined,
      undefined,
      undefined,
      'LEAD',
      'lead-1',
    );
    expect(result.data.length).toBe(1);
    expect(result.data[0].id).toBe('task-1');
  });

  it('findAll deleted only returns deleted Org A records', async () => {
    const result = await service.findAll(
      ORG_A,
      1,
      10,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      true,
    );
    expect(result.data.length).toBe(1);
    expect(result.data[0].id).toBe('task-3');
  });

  it('Org A user can restore Org A deleted task', async () => {
    const result = await service.restore('task-3', ORG_A, USER_A);
    expect(result.id).toBe('task-3');
    expect(result.deletedAt).toBeNull();
  });

  it('Org A user CANNOT restore Org B task', async () => {
    await expect(service.restore('task-2', ORG_A, USER_A)).rejects.toThrow(NotFoundException);
  });
});

// ---------- NOTE FILTERING ----------
describe('Organization Isolation — Note', () => {
  let service: NoteService;

  const noteOrgA = {
    id: 'note-1', organizationId: ORG_A, ownerId: USER_A,
    content: 'OrgA Note', relatedType: 'LEAD', relatedId: 'lead-1', deletedAt: null,
  };
  const noteOrgAOtherRecord = {
    id: 'note-2', organizationId: ORG_A, ownerId: USER_A,
    content: 'OrgA Other Note', relatedType: 'OPPORTUNITY', relatedId: 'opp-1', deletedAt: null,
  };
  const noteOrgB = {
    id: 'note-3', organizationId: ORG_B, ownerId: 'user-b',
    content: 'OrgB Note', relatedType: 'LEAD', relatedId: 'lead-1', deletedAt: null,
  };

  beforeEach(async () => {
    const mockPrisma = buildMockPrisma('note', [noteOrgA, noteOrgAOtherRecord, noteOrgB]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NoteService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();
    service = module.get<NoteService>(NoteService);
  });

  it('findAll can filter Org A notes by related type and related id', async () => {
    const result = await service.findAll(ORG_A, 1, 10, 'LEAD', 'lead-1');
    expect(result.data.length).toBe(1);
    expect(result.data[0].id).toBe('note-1');
  });
});

// ---------- CASE ISOLATION ----------
describe('Organization Isolation — Case', () => {
  let service: CaseService;

  const caseOrgA = {
    id: 'case-1', organizationId: ORG_A, ownerId: USER_A,
    subject: 'OrgA Case', status: 'NEW', priority: 'MEDIUM', deletedAt: null,
  };
  const caseOrgB = {
    id: 'case-2', organizationId: ORG_B, ownerId: 'user-b',
    subject: 'OrgB Case', status: 'NEW', priority: 'HIGH', deletedAt: null,
  };

  beforeEach(async () => {
    const mockPrisma = buildMockPrisma('case', [caseOrgA, caseOrgB]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaseService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();
    service = module.get<CaseService>(CaseService);
  });

  it('Org A user can read Org A case', async () => {
    const result = await service.findById('case-1', ORG_A);
    expect(result.id).toBe('case-1');
  });

  it('Org A user CANNOT read Org B case', async () => {
    await expect(service.findById('case-2', ORG_A)).rejects.toThrow(NotFoundException);
  });

  it('Org A user CANNOT update Org B case', async () => {
    await expect(service.update('case-2', ORG_A, { subject: 'Hacked' })).rejects.toThrow(NotFoundException);
  });

  it('Org A user CANNOT delete Org B case', async () => {
    await expect(service.delete('case-2', ORG_A, USER_A)).rejects.toThrow(NotFoundException);
  });

  it('findAll only returns Org A records', async () => {
    const result = await service.findAll(ORG_A, 1, 10);
    expect(result.data.length).toBe(1);
    expect(result.data[0].id).toBe('case-1');
  });
});
