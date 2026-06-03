import { Test, TestingModule } from '@nestjs/testing';
import { LeadService } from '../src/modules/leads/application/services/lead.service';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LeadStatus, TaskPriority, TaskStatus } from '@prisma/client';
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
      findMany: jest.fn(),
    },
    contact: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    opportunity: {
      create: jest.fn(),
      findMany: jest.fn(),
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

    it('should set convertedById and convertedAt when converting a lead', async () => {
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
          contact: {
            create: jest.fn().mockResolvedValue({
              id: 'contact-1',
              accountId: 'account-1',
            }),
          },
          opportunity: { create: jest.fn().mockResolvedValue({ id: 'opportunity-1' }) },
          lead: {
            update: jest.fn().mockResolvedValue({
              ...mockLead,
              status: LeadStatus.CONVERTED,
              convertedAccountId: 'account-1',
              convertedContactId: 'contact-1',
              convertedOpportunityId: 'opportunity-1',
              convertedAt: new Date(),
              convertedById: ownerId,
            }),
          },
        };

        await callback(txMock);

        expect(txMock.lead.update).toHaveBeenCalledWith({
          where: { id: leadId },
          data: expect.objectContaining({
            status: LeadStatus.CONVERTED,
            convertedAt: expect.any(Date),
            convertedById: ownerId,
          }),
        });

        return {
          ...mockLead,
          status: LeadStatus.CONVERTED,
          convertedAccountId: 'account-1',
          convertedContactId: 'contact-1',
          convertedOpportunityId: 'opportunity-1',
          convertedAt: new Date(),
          convertedById: ownerId,
        };
      });

      const result = await service.convert(leadId, organizationId, ownerId, {});

      expect(result.convertedById).toBe(ownerId);
      expect(result.convertedAt).toBeInstanceOf(Date);
    });

    it('should create follow-up tasks from selected task template after conversion', async () => {
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
      };

      const selectedTemplate = {
        id: 'template-1',
        organizationId,
        name: 'Mẫu chăm sóc sau chuyển đổi',
        isActive: true,
        groups: [
          {
            id: 'group-1',
            name: 'Ngày đầu',
            sortOrder: 1,
            items: [
              {
                id: 'item-1',
                title: 'Gọi xác nhận nhu cầu',
                description: 'Gọi lại khách sau khi chuyển đổi.',
                priority: TaskPriority.HIGH,
                dueAfterDays: 1,
                sortOrder: 1,
                isActive: true,
              },
              {
                id: 'item-2',
                title: 'Công việc đã tắt',
                description: null,
                priority: TaskPriority.NORMAL,
                dueAfterDays: 2,
                sortOrder: 2,
                isActive: false,
              },
            ],
          },
          {
            id: 'group-2',
            name: 'Tuần đầu',
            sortOrder: 2,
            items: [
              {
                id: 'item-3',
                title: 'Gửi tài liệu triển khai',
                description: 'Gửi proposal và tài liệu onboarding.',
                priority: TaskPriority.NORMAL,
                dueAfterDays: 3,
                sortOrder: 1,
                isActive: true,
              },
            ],
          },
        ],
      };

      const convertedLead = {
        ...mockLead,
        status: LeadStatus.CONVERTED,
        convertedAccountId: 'account-1',
        convertedContactId: 'contact-1',
        convertedOpportunityId: 'opportunity-1',
      };

      const mockTaskTemplateService = {
        findTemplateForConversion: jest.fn().mockResolvedValue(selectedTemplate),
      };
      (service as any).taskTemplateService = mockTaskTemplateService;

      mockPrismaService.lead.findFirst.mockResolvedValue(mockLead);

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const createMany = jest.fn().mockResolvedValue({ count: 2 });
        const txMock = {
          account: { create: jest.fn().mockResolvedValue({ id: 'account-1' }) },
          contact: { create: jest.fn().mockResolvedValue({ id: 'contact-1' }) },
          opportunity: { create: jest.fn().mockResolvedValue({ id: 'opportunity-1' }) },
          task: { createMany },
          lead: { update: jest.fn().mockResolvedValue(convertedLead) },
        };

        const transactionResult = await callback(txMock);

        expect(createMany).toHaveBeenCalledWith({
          data: expect.arrayContaining([
            expect.objectContaining({
              organizationId,
              ownerId,
              assignedToId: ownerId,
              subject: '[Ngày đầu] Gọi xác nhận nhu cầu',
              status: TaskStatus.NOT_STARTED,
              priority: TaskPriority.HIGH,
              relatedType: 'OPPORTUNITY',
              relatedId: 'opportunity-1',
            }),
            expect.objectContaining({
              subject: '[Tuần đầu] Gửi tài liệu triển khai',
              relatedId: 'opportunity-1',
            }),
          ]),
        });
        expect(createMany.mock.calls[0][0].data).toHaveLength(2);

        return transactionResult;
      });

      const result = await service.convert(leadId, organizationId, ownerId, {
        createTasksFromTemplate: true,
        taskTemplateId: 'template-1',
      });

      expect(mockTaskTemplateService.findTemplateForConversion).toHaveBeenCalledWith(
        organizationId,
        'template-1',
      );
      expect(result.taskTemplateResult).toEqual(
        expect.objectContaining({
          requested: true,
          templateId: 'template-1',
          templateName: 'Mẫu chăm sóc sau chuyển đổi',
          createdCount: 2,
        }),
      );
    });

    it('should reject an existing contact from a different account', async () => {
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
          account: {
            findFirst: jest.fn().mockResolvedValue({ id: 'account-1' }),
          },
          contact: {
            findFirst: jest.fn().mockResolvedValue({
              id: 'contact-1',
              accountId: 'account-2',
            }),
          },
          opportunity: { create: jest.fn() },
          lead: { update: jest.fn() },
        };

        return callback(txMock);
      });

      await expect(
        service.convert(leadId, organizationId, ownerId, {
          accountMode: 'USE_EXISTING',
          accountId: 'account-1',
          contactMode: 'USE_EXISTING',
          contactId: 'contact-1',
        }),
      ).rejects.toThrow('Selected contact does not belong to the selected account.');
    });

    it('should reject an existing opportunity from a different account', async () => {
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
          account: {
            findFirst: jest.fn().mockResolvedValue({ id: 'account-1' }),
          },
          contact: {
            create: jest.fn().mockResolvedValue({
              id: 'contact-1',
              accountId: 'account-1',
            }),
          },
          opportunity: {
            findFirst: jest.fn().mockResolvedValue({
              id: 'opportunity-1',
              accountId: 'account-2',
            }),
          },
          lead: { update: jest.fn() },
        };

        return callback(txMock);
      });

      await expect(
        service.convert(leadId, organizationId, ownerId, {
          accountMode: 'USE_EXISTING',
          accountId: 'account-1',
          opportunityMode: 'USE_EXISTING',
          opportunityId: 'opportunity-1',
        }),
      ).rejects.toThrow('Selected opportunity does not belong to the selected account.');
    });

    it('should return conversion suggestions for matching existing records', async () => {
      const mockLead = {
        id: leadId,
        organizationId,
        ownerId,
        firstName: 'John',
        lastName: 'Doe',
        company: 'Tech Corp',
        email: 'john@techcorp.com',
        phone: '+1-555-0100',
        status: LeadStatus.NEW,
      };

      mockPrismaService.lead.findFirst.mockResolvedValue(mockLead);
      mockPrismaService.account.findMany.mockResolvedValue([
        {
          id: 'account-1',
          name: 'Tech Corp',
          website: 'https://techcorp.com',
          phone: '+1-555-0200',
          ownerId,
        },
      ]);
      mockPrismaService.contact.findMany.mockResolvedValue([
        {
          id: 'contact-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@techcorp.com',
          phone: '+1-555-0100',
          accountId: 'account-1',
        },
      ]);
      mockPrismaService.opportunity.findMany.mockResolvedValue([
        {
          id: 'opportunity-1',
          name: 'Tech Corp renewal',
          stage: 'QUALIFY',
          accountId: 'account-1',
          amount: null,
        },
      ]);

      const result = await service.getConversionSuggestions(leadId, organizationId);

      expect(result.accounts).toHaveLength(1);
      expect(result.contacts).toHaveLength(1);
      expect(result.opportunities).toHaveLength(1);
      expect(mockPrismaService.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId,
            deletedAt: null,
          }),
        }),
      );
    });
  });
});
