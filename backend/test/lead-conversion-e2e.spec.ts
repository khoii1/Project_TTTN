import { Test, TestingModule } from '@nestjs/testing';
import { LeadService } from '../src/modules/leads/application/services/lead.service';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { AuditLogService } from '../src/infrastructure/audit/audit-log.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LeadStatus } from '@prisma/client';

/**
 * Lead Conversion — Extended E2E-style Tests
 *
 * Covers:
 * 1. Successful conversion with all entities created
 * 2. Prevent double conversion
 * 3. Cross-org conversion blocked
 * 4. Audit log called after conversion
 */

describe('Lead Conversion E2E', () => {
  let service: LeadService;

  const ORG_A = 'org-a';
  const ORG_B = 'org-b';
  const USER_A = 'user-a';

  const baseLead = {
    id: 'lead-1',
    organizationId: ORG_A,
    ownerId: USER_A,
    firstName: 'Alice',
    lastName: 'Smith',
    company: 'Acme Corp',
    email: 'alice@acme.com',
    phone: '+1-555-0100',
    title: 'CTO',
    status: LeadStatus.NEW,
    convertedAccountId: null,
    convertedContactId: null,
    convertedOpportunityId: null,
    deletedAt: null,
  };

  const leadOrgB = {
    ...baseLead,
    id: 'lead-orgb',
    organizationId: ORG_B,
    ownerId: 'user-b',
  };

  const mockPrismaService = {
    lead: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    account: { create: jest.fn() },
    contact: { create: jest.fn() },
    opportunity: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  const mockAuditLogService = { log: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();
    service = module.get<LeadService>(LeadService);
  });

  // ---- Test 1: Successful conversion ----
  it('should convert lead and create account, contact, opportunity in transaction', async () => {
    const convertedLead = {
      ...baseLead,
      status: LeadStatus.CONVERTED,
      convertedAccountId: 'new-account',
      convertedContactId: 'new-contact',
      convertedOpportunityId: 'new-opp',
    };

    mockPrismaService.lead.findFirst.mockResolvedValue({ ...baseLead });

    mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        account: { create: jest.fn().mockResolvedValue({ id: 'new-account', name: 'Acme Corp' }) },
        contact: { create: jest.fn().mockResolvedValue({ id: 'new-contact' }) },
        opportunity: { create: jest.fn().mockResolvedValue({ id: 'new-opp' }) },
        lead: { update: jest.fn().mockResolvedValue(convertedLead) },
      };
      return callback(tx);
    });

    const result = await service.convert('lead-1', ORG_A, USER_A, {
      accountType: 'Enterprise',
      contactTitle: 'CTO',
    });

    expect(result.status).toBe(LeadStatus.CONVERTED);
    expect(result.convertedAccountId).toBe('new-account');
    expect(result.convertedContactId).toBe('new-contact');
    expect(result.convertedOpportunityId).toBe('new-opp');

    // Verify $transaction was used
    expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
  });

  // ---- Test 2: Prevent double conversion ----
  it('should throw BadRequestException when lead is already converted', async () => {
    const alreadyConverted = {
      ...baseLead,
      status: LeadStatus.CONVERTED,
      convertedAccountId: 'existing-account',
    };

    mockPrismaService.lead.findFirst.mockResolvedValue(alreadyConverted);

    await expect(
      service.convert('lead-1', ORG_A, USER_A, {}),
    ).rejects.toThrow(BadRequestException);

    // Transaction should NOT have been called
    expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
  });

  // ---- Test 3: Cross-org conversion blocked ----
  it('should throw NotFoundException when converting lead from another organization', async () => {
    // findFirst returns null because organizationId doesn't match
    mockPrismaService.lead.findFirst.mockResolvedValue(null);

    await expect(
      service.convert('lead-orgb', ORG_A, USER_A, {}),
    ).rejects.toThrow(NotFoundException);

    expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
  });

  // ---- Test 4: Converting deleted lead is blocked ----
  it('should throw NotFoundException when lead is soft-deleted', async () => {
    mockPrismaService.lead.findFirst.mockResolvedValue(null); // deletedAt filter blocks it

    await expect(
      service.convert('lead-1', ORG_A, USER_A, {}),
    ).rejects.toThrow(NotFoundException);
  });

  // ---- Test 5: Audit log is called on successful conversion ----
  it('should log LEAD_CONVERSION audit event after successful conversion', async () => {
    const convertedLead = {
      ...baseLead,
      status: LeadStatus.CONVERTED,
      convertedAccountId: 'acc-1',
      convertedContactId: 'con-1',
      convertedOpportunityId: 'opp-1',
    };

    mockPrismaService.lead.findFirst.mockResolvedValue({ ...baseLead });

    mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        account: { create: jest.fn().mockResolvedValue({ id: 'acc-1' }) },
        contact: { create: jest.fn().mockResolvedValue({ id: 'con-1' }) },
        opportunity: { create: jest.fn().mockResolvedValue({ id: 'opp-1' }) },
        lead: { update: jest.fn().mockResolvedValue(convertedLead) },
      };
      return callback(tx);
    });

    await service.convert('lead-1', ORG_A, USER_A, {});

    expect(mockAuditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LEAD_CONVERSION',
        entityType: 'Lead',
        entityId: 'lead-1',
        organizationId: ORG_A,
        userId: USER_A,
      }),
    );
  });

  // ---- Test 6: Verify account uses lead's company name ----
  it('should create account with lead company name inside transaction', async () => {
    const convertedLead = {
      ...baseLead,
      status: LeadStatus.CONVERTED,
      convertedAccountId: 'acc-1',
      convertedContactId: 'con-1',
      convertedOpportunityId: 'opp-1',
    };

    mockPrismaService.lead.findFirst.mockResolvedValue({ ...baseLead });

    let capturedAccountData: any;

    mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        account: {
          create: jest.fn().mockImplementation((args) => {
            capturedAccountData = args.data;
            return { id: 'acc-1' };
          }),
        },
        contact: { create: jest.fn().mockResolvedValue({ id: 'con-1' }) },
        opportunity: { create: jest.fn().mockResolvedValue({ id: 'opp-1' }) },
        lead: { update: jest.fn().mockResolvedValue(convertedLead) },
      };
      return callback(tx);
    });

    await service.convert('lead-1', ORG_A, USER_A, { accountType: 'Enterprise' });

    expect(capturedAccountData.name).toBe('Acme Corp');
    expect(capturedAccountData.type).toBe('Enterprise');
    expect(capturedAccountData.organizationId).toBe(ORG_A);
  });
});
