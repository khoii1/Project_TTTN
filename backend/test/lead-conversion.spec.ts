import { Test, TestingModule } from '@nestjs/testing';
import { LeadService } from '../src/modules/leads/application/services/lead.service';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LeadStatus } from '@prisma/client';
import { AuditLogService } from '../src/infrastructure/audit/audit-log.service';

describe('Lead Conversion (Use Case)', () => {
  let service: LeadService;
  let prisma: PrismaService;

  const mockPrismaService = {
    lead: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    account: {
      create: jest.fn(),
    },
    contact: {
      create: jest.fn(),
    },
    opportunity: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockAuditLogService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    }).compile();

    service = module.get<LeadService>(LeadService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('convert', () => {
    const leadId = 'lead-1';
    const organizationId = 'org-1';
    const ownerId = 'user-1';

    it('should successfully convert a lead to account, contact, and opportunity', async () => {
      const mockLead = {
        id: leadId,
        organizationId,
        ownerId,
        firstName: 'John',
        lastName: 'Doe',
        company: 'Tech Corp',
        email: 'john@techcorp.com',
        phone: '+1-555-0100',
        title: 'CTO',
        status: LeadStatus.NEW,
        convertedAccountId: null,
        convertedContactId: null,
        convertedOpportunityId: null,
      };

      const mockAccount = {
        id: 'account-1',
        organizationId,
        ownerId,
        name: 'Tech Corp',
        type: 'Enterprise',
      };

      const mockContact = {
        id: 'contact-1',
        organizationId,
        ownerId,
        accountId: 'account-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@techcorp.com',
        phone: '+1-555-0100',
        title: 'CTO',
      };

      const mockOpportunity = {
        id: 'opportunity-1',
        organizationId,
        ownerId,
        accountId: 'account-1',
        contactId: 'contact-1',
        name: 'New opportunity - Tech Corp',
        stage: 'QUALIFY',
        amount: null,
      };

      const convertedLead = {
        ...mockLead,
        status: LeadStatus.CONVERTED,
        convertedAccountId: 'account-1',
        convertedContactId: 'contact-1',
        convertedOpportunityId: 'opportunity-1',
      };

      mockPrismaService.lead.findFirst.mockResolvedValue(mockLead);

      // Mock the transaction function
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const txMock = {
          account: { create: jest.fn().mockResolvedValue(mockAccount) },
          contact: { create: jest.fn().mockResolvedValue(mockContact) },
          opportunity: { create: jest.fn().mockResolvedValue(mockOpportunity) },
          lead: { update: jest.fn().mockResolvedValue(convertedLead) },
        };

        return callback(txMock);
      });

      const result = await service.convert(leadId, organizationId, ownerId, {
        contactTitle: 'CTO',
        accountType: 'Enterprise',
      });

      expect(result.status).toBe(LeadStatus.CONVERTED);
      expect(result.convertedAccountId).toBe('account-1');
      expect(result.convertedContactId).toBe('contact-1');
      expect(result.convertedOpportunityId).toBe('opportunity-1');
    });

    it('should throw NotFoundException if lead not found', async () => {
      mockPrismaService.lead.findFirst.mockResolvedValue(null);

      await expect(service.convert(leadId, organizationId, ownerId, {})).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException if lead is already converted', async () => {
      const mockLead = {
        id: leadId,
        organizationId,
        ownerId,
        firstName: 'John',
        lastName: 'Doe',
        company: 'Tech Corp',
        status: LeadStatus.CONVERTED,
        convertedAccountId: 'account-1',
        convertedContactId: 'contact-1',
        convertedOpportunityId: 'opportunity-1',
      };

      mockPrismaService.lead.findFirst.mockResolvedValue(mockLead);

      await expect(service.convert(leadId, organizationId, ownerId, {})).rejects.toThrow(
        BadRequestException
      );
    });

    it('should create account with company name from lead', async () => {
      const mockLead = {
        id: leadId,
        organizationId,
        ownerId,
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Inc',
        status: LeadStatus.NEW,
      };

      mockPrismaService.lead.findFirst.mockResolvedValue(mockLead);

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const txMock = {
          account: { create: jest.fn().mockResolvedValue({ id: 'account-1' }) },
          contact: { create: jest.fn().mockResolvedValue({ id: 'contact-1' }) },
          opportunity: { create: jest.fn().mockResolvedValue({ id: 'opportunity-1' }) },
          lead: { update: jest.fn().mockResolvedValue({ ...mockLead, status: LeadStatus.CONVERTED, convertedAccountId: 'account-1', convertedContactId: 'contact-1', convertedOpportunityId: 'opportunity-1' }) },
        };

        await callback(txMock);

        // Verify account was created with company name
        expect(txMock.account.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            name: 'Acme Inc',
          }),
        });

        return { ...mockLead, status: LeadStatus.CONVERTED };
      });

      await service.convert(leadId, organizationId, ownerId, {});

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should create opportunity with QUALIFY stage', async () => {
      const mockLead = {
        id: leadId,
        organizationId,
        ownerId,
        firstName: 'John',
        lastName: 'Doe',
        company: 'Tech Corp',
        status: LeadStatus.NEW,
      };

      mockPrismaService.lead.findFirst.mockResolvedValue(mockLead);

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const txMock = {
          account: { create: jest.fn().mockResolvedValue({ id: 'account-1' }) },
          contact: { create: jest.fn().mockResolvedValue({ id: 'contact-1' }) },
          opportunity: { create: jest.fn().mockResolvedValue({ id: 'opportunity-1' }) },
          lead: { update: jest.fn().mockResolvedValue({ ...mockLead, status: LeadStatus.CONVERTED, convertedAccountId: 'account-1', convertedContactId: 'contact-1', convertedOpportunityId: 'opportunity-1' }) },
        };

        await callback(txMock);

        // Verify opportunity was created with QUALIFY stage
        expect(txMock.opportunity.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            stage: 'QUALIFY',
            name: expect.stringContaining('Tech Corp'),
          }),
        });

        return { ...mockLead, status: LeadStatus.CONVERTED };
      });

      await service.convert(leadId, organizationId, ownerId, {});

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });
});
