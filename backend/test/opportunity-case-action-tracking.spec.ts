import { Test, TestingModule } from '@nestjs/testing';
import { CaseStatus, OpportunityStage } from '@prisma/client';
import { AuditAction, AuditLogService } from '../src/infrastructure/audit/audit-log.service';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { CaseService } from '../src/modules/cases/application/services/case.service';
import { OpportunityService } from '../src/modules/opportunities/application/services/opportunity.service';

describe('Opportunity and Case Action Tracking', () => {
  const mockAuditLogService = {
    log: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('update opportunity stage sets stageChangedById and stageChangedAt', async () => {
    const opportunity = {
      id: 'opportunity-1',
      organizationId: 'org-1',
      ownerId: 'owner-1',
      accountId: 'account-1',
      contactId: null,
      name: 'Enterprise Deal',
      stage: OpportunityStage.QUALIFY,
      amount: null,
      closeDate: null,
      nextStep: null,
      source: null,
      sourceDetail: null,
      description: null,
      stageChangedAt: null,
      stageChangedById: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPrismaService = {
      opportunity: {
        findFirst: jest.fn().mockResolvedValue(opportunity),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...opportunity, ...data }),
        ),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpportunityService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    const service = module.get<OpportunityService>(OpportunityService);
    const result = await service.changeStage(
      'opportunity-1',
      'org-1',
      'actor-1',
      { stage: OpportunityStage.PROPOSE },
    );

    expect(mockPrismaService.opportunity.update).toHaveBeenCalledWith({
      where: { id: 'opportunity-1' },
      data: {
        stage: OpportunityStage.PROPOSE,
        stageChangedAt: expect.any(Date),
        stageChangedById: 'actor-1',
      },
    });
    expect(result.stageChangedById).toBe('actor-1');
    expect(result.stageChangedAt).toBeInstanceOf(Date);
    expect(mockAuditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'actor-1',
        action: AuditAction.STAGE_CHANGE,
      }),
    );
  });

  it('close case sets closedById and closedAt', async () => {
    const crmCase = {
      id: 'case-1',
      organizationId: 'org-1',
      ownerId: 'owner-1',
      accountId: null,
      contactId: null,
      subject: 'Support request',
      status: CaseStatus.WORKING,
      priority: 'MEDIUM',
      source: null,
      sourceDetail: null,
      description: null,
      closedAt: null,
      closedById: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPrismaService = {
      case: {
        findFirst: jest.fn().mockResolvedValue(crmCase),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...crmCase, ...data }),
        ),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaseService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    const service = module.get<CaseService>(CaseService);
    const result = await service.changeStatus('case-1', 'org-1', 'actor-1', {
      status: CaseStatus.CLOSED,
    });

    expect(mockPrismaService.case.update).toHaveBeenCalledWith({
      where: { id: 'case-1' },
      data: {
        status: CaseStatus.CLOSED,
        closedAt: expect.any(Date),
        closedById: 'actor-1',
      },
    });
    expect(result.closedById).toBe('actor-1');
    expect(result.closedAt).toBeInstanceOf(Date);
    expect(mockAuditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'actor-1',
        action: AuditAction.STATUS_CHANGE,
      }),
    );
  });

  it('moving case away from CLOSED clears closedById and closedAt', async () => {
    const crmCase = {
      id: 'case-1',
      organizationId: 'org-1',
      ownerId: 'owner-1',
      accountId: null,
      contactId: null,
      subject: 'Support request',
      status: CaseStatus.CLOSED,
      priority: 'MEDIUM',
      source: null,
      sourceDetail: null,
      description: null,
      closedAt: new Date(),
      closedById: 'closer-1',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPrismaService = {
      case: {
        findFirst: jest.fn().mockResolvedValue(crmCase),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...crmCase, ...data }),
        ),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaseService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    const service = module.get<CaseService>(CaseService);
    const result = await service.changeStatus('case-1', 'org-1', 'actor-1', {
      status: CaseStatus.WORKING,
    });

    expect(mockPrismaService.case.update).toHaveBeenCalledWith({
      where: { id: 'case-1' },
      data: {
        status: CaseStatus.WORKING,
        closedAt: null,
        closedById: null,
      },
    });
    expect(result.closedById).toBeNull();
    expect(result.closedAt).toBeNull();
  });
});
