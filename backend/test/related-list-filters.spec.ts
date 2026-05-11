import { ContactService } from '../src/modules/contacts/application/services/contact.service';
import { OpportunityService } from '../src/modules/opportunities/application/services/opportunity.service';
import { CaseService } from '../src/modules/cases/application/services/case.service';

const ORG_A = 'org-a';
const ORG_B = 'org-b';

const mockAuditLogService = { log: jest.fn() };

const makeModel = (records: Record<string, any>[]) => ({
  findMany: jest.fn().mockImplementation(({ where }) =>
    Promise.resolve(
      records.filter((record) =>
        Object.entries(where).every(([key, value]) => {
          if (key === 'deletedAt') {
            if (value === null) return !record.deletedAt;
            if ((value as any)?.not === null) return !!record.deletedAt;
          }
          if (key === 'OR') return true;
          return record[key] === value;
        })
      )
    )
  ),
  count: jest.fn().mockImplementation(({ where }) =>
    Promise.resolve(
      records.filter((record) =>
        Object.entries(where).every(([key, value]) => {
          if (key === 'deletedAt') {
            if (value === null) return !record.deletedAt;
            if ((value as any)?.not === null) return !!record.deletedAt;
          }
          if (key === 'OR') return true;
          return record[key] === value;
        })
      ).length
    )
  ),
});

describe('Related list backend filters', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('filters contacts by accountId within organization and active records by default', async () => {
    const contact = makeModel([
      {
        id: 'contact-a1',
        organizationId: ORG_A,
        accountId: 'account-a',
        lastName: 'A',
        ownerId: 'user-a',
        deletedAt: null,
      },
      {
        id: 'contact-a2-deleted',
        organizationId: ORG_A,
        accountId: 'account-a',
        lastName: 'Deleted',
        ownerId: 'user-a',
        deletedAt: new Date(),
      },
      {
        id: 'contact-b1',
        organizationId: ORG_B,
        accountId: 'account-a',
        lastName: 'B',
        ownerId: 'user-b',
        deletedAt: null,
      },
    ]);
    const service = new ContactService({ contact } as any, mockAuditLogService as any);

    const result = await service.findAll(ORG_A, 1, 10, undefined, undefined, false, 'account-a');

    expect(contact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: ORG_A,
          accountId: 'account-a',
          deletedAt: null,
        }),
      })
    );
    expect(result.data.map((item) => item.id)).toEqual(['contact-a1']);
  });

  it('keeps deleted=true behavior when filtering contacts by accountId', async () => {
    const contact = makeModel([
      {
        id: 'contact-active',
        organizationId: ORG_A,
        accountId: 'account-a',
        lastName: 'Active',
        ownerId: 'user-a',
        deletedAt: null,
      },
      {
        id: 'contact-deleted',
        organizationId: ORG_A,
        accountId: 'account-a',
        lastName: 'Deleted',
        ownerId: 'user-a',
        deletedAt: new Date(),
      },
    ]);
    const service = new ContactService({ contact } as any, mockAuditLogService as any);

    const result = await service.findAll(ORG_A, 1, 10, undefined, undefined, true, 'account-a');

    expect(contact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountId: 'account-a',
          deletedAt: { not: null },
        }),
      })
    );
    expect(result.data.map((item) => item.id)).toEqual(['contact-deleted']);
  });

  it('filters opportunities by accountId within organization', async () => {
    const opportunity = makeModel([
      {
        id: 'opp-a1',
        organizationId: ORG_A,
        accountId: 'account-a',
        name: 'A Deal',
        stage: 'QUALIFY',
        ownerId: 'user-a',
        deletedAt: null,
      },
      {
        id: 'opp-b1',
        organizationId: ORG_B,
        accountId: 'account-a',
        name: 'B Deal',
        stage: 'QUALIFY',
        ownerId: 'user-b',
        deletedAt: null,
      },
    ]);
    const service = new OpportunityService({ opportunity } as any, mockAuditLogService as any);

    const result = await service.findAll(
      ORG_A,
      1,
      10,
      undefined,
      undefined,
      undefined,
      false,
      'account-a'
    );

    expect(opportunity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: ORG_A,
          accountId: 'account-a',
          deletedAt: null,
        }),
      })
    );
    expect(result.data.map((item) => item.id)).toEqual(['opp-a1']);
  });

  it('filters opportunities by contactId within organization', async () => {
    const opportunity = makeModel([
      {
        id: 'opp-contact',
        organizationId: ORG_A,
        accountId: 'account-a',
        contactId: 'contact-a',
        name: 'Contact Deal',
        stage: 'PROPOSE',
        ownerId: 'user-a',
        deletedAt: null,
      },
      {
        id: 'opp-other-contact',
        organizationId: ORG_A,
        accountId: 'account-a',
        contactId: 'contact-other',
        name: 'Other Deal',
        stage: 'PROPOSE',
        ownerId: 'user-a',
        deletedAt: null,
      },
    ]);
    const service = new OpportunityService({ opportunity } as any, mockAuditLogService as any);

    const result = await service.findAll(
      ORG_A,
      1,
      10,
      undefined,
      undefined,
      undefined,
      false,
      undefined,
      'contact-a'
    );

    expect(opportunity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: ORG_A,
          contactId: 'contact-a',
          deletedAt: null,
        }),
      })
    );
    expect(result.data.map((item) => item.id)).toEqual(['opp-contact']);
  });

  it('keeps deleted=true behavior when filtering opportunities', async () => {
    const opportunity = makeModel([
      {
        id: 'opp-active',
        organizationId: ORG_A,
        accountId: 'account-a',
        name: 'Active Deal',
        stage: 'QUALIFY',
        ownerId: 'user-a',
        deletedAt: null,
      },
      {
        id: 'opp-deleted',
        organizationId: ORG_A,
        accountId: 'account-a',
        name: 'Deleted Deal',
        stage: 'QUALIFY',
        ownerId: 'user-a',
        deletedAt: new Date(),
      },
    ]);
    const service = new OpportunityService({ opportunity } as any, mockAuditLogService as any);

    const result = await service.findAll(
      ORG_A,
      1,
      10,
      undefined,
      undefined,
      undefined,
      true,
      'account-a'
    );

    expect(opportunity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountId: 'account-a',
          deletedAt: { not: null },
        }),
      })
    );
    expect(result.data.map((item) => item.id)).toEqual(['opp-deleted']);
  });

  it('filters cases by accountId within organization', async () => {
    const crmCase = makeModel([
      {
        id: 'case-a1',
        organizationId: ORG_A,
        accountId: 'account-a',
        subject: 'A Case',
        status: 'NEW',
        priority: 'MEDIUM',
        ownerId: 'user-a',
        deletedAt: null,
      },
      {
        id: 'case-b1',
        organizationId: ORG_B,
        accountId: 'account-a',
        subject: 'B Case',
        status: 'NEW',
        priority: 'MEDIUM',
        ownerId: 'user-b',
        deletedAt: null,
      },
    ]);
    const service = new CaseService({ case: crmCase } as any, mockAuditLogService as any);

    const result = await service.findAll(
      ORG_A,
      1,
      10,
      undefined,
      undefined,
      undefined,
      undefined,
      false,
      'account-a'
    );

    expect(crmCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: ORG_A,
          accountId: 'account-a',
          deletedAt: null,
        }),
      })
    );
    expect(result.data.map((item) => item.id)).toEqual(['case-a1']);
  });

  it('filters cases by contactId within organization', async () => {
    const crmCase = makeModel([
      {
        id: 'case-contact',
        organizationId: ORG_A,
        contactId: 'contact-a',
        subject: 'Contact Case',
        status: 'WORKING',
        priority: 'HIGH',
        ownerId: 'user-a',
        deletedAt: null,
      },
      {
        id: 'case-other-contact',
        organizationId: ORG_A,
        contactId: 'contact-other',
        subject: 'Other Case',
        status: 'WORKING',
        priority: 'HIGH',
        ownerId: 'user-a',
        deletedAt: null,
      },
    ]);
    const service = new CaseService({ case: crmCase } as any, mockAuditLogService as any);

    const result = await service.findAll(
      ORG_A,
      1,
      10,
      undefined,
      undefined,
      undefined,
      undefined,
      false,
      undefined,
      'contact-a'
    );

    expect(crmCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: ORG_A,
          contactId: 'contact-a',
          deletedAt: null,
        }),
      })
    );
    expect(result.data.map((item) => item.id)).toEqual(['case-contact']);
  });

  it('keeps deleted=true behavior when filtering cases', async () => {
    const crmCase = makeModel([
      {
        id: 'case-active',
        organizationId: ORG_A,
        accountId: 'account-a',
        subject: 'Active Case',
        status: 'NEW',
        priority: 'MEDIUM',
        ownerId: 'user-a',
        deletedAt: null,
      },
      {
        id: 'case-deleted',
        organizationId: ORG_A,
        accountId: 'account-a',
        subject: 'Deleted Case',
        status: 'NEW',
        priority: 'MEDIUM',
        ownerId: 'user-a',
        deletedAt: new Date(),
      },
    ]);
    const service = new CaseService({ case: crmCase } as any, mockAuditLogService as any);

    const result = await service.findAll(
      ORG_A,
      1,
      10,
      undefined,
      undefined,
      undefined,
      undefined,
      true,
      'account-a'
    );

    expect(crmCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountId: 'account-a',
          deletedAt: { not: null },
        }),
      })
    );
    expect(result.data.map((item) => item.id)).toEqual(['case-deleted']);
  });
});
