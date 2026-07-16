import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { LeadStatus } from '@prisma/client';
import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LeadCaptureDto } from '../src/modules/public/application/dto/lead-capture.dto';
import { LeadCaptureService } from '../src/modules/public/application/services/lead-capture.service';

const ORG = 'org-sample';
const OWNER = 'user-admin';

describe('Web-to-Lead capture', () => {
  const originalEnv = process.env;
  const auditLog = { log: jest.fn().mockResolvedValue(undefined) };

  const createPrisma = () =>
    ({
      organization: {
        findUnique: jest.fn().mockResolvedValue({ id: ORG }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: OWNER, organizationId: ORG }),
      },
      lead: {
        create: jest.fn().mockResolvedValue({
          id: 'lead-web-1',
          organizationId: ORG,
          ownerId: OWNER,
          firstName: 'Nguyen Minh',
          lastName: 'An',
          company: 'Noi That An Phat',
          source: 'Website',
          sourceDetail: 'Form đăng ký tư vấn trên website',
          status: LeadStatus.NEW,
        }),
      },
    }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      PUBLIC_LEAD_ORGANIZATION_ID: ORG,
      PUBLIC_LEAD_OWNER_ID: OWNER,
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('creates a Website lead for a valid public form submission', async () => {
    const prisma = createPrisma();
    const service = new LeadCaptureService(prisma, auditLog as any);

    const result = await service.capture({
      fullName: 'Nguyen Minh An',
      company: 'Noi That An Phat',
      title: 'Giam doc kinh doanh',
      email: 'an@example.com',
      phone: '0908456789',
      website: 'https://example.com',
      industry: 'Noi that',
      companySize: '20-50 nhan su',
      preferredContactTime: 'Buoi sang',
      message: 'Toi muon duoc tu van CRM.',
    });

    expect(result.leadId).toBe('lead-web-1');
    expect(prisma.lead.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG,
        ownerId: OWNER,
        firstName: 'Nguyen Minh',
        lastName: 'An',
        source: 'Website',
        sourceDetail: 'Form đăng ký tư vấn trên website',
        status: LeadStatus.NEW,
        description: expect.stringContaining('Toi muon duoc tu van CRM.'),
      }),
    });
    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORG,
        userId: OWNER,
        action: 'CREATE',
        entityType: 'Lead',
      }),
    );
  });

  it('rejects a missing fullName', async () => {
    const service = new LeadCaptureService(createPrisma(), auditLog as any);

    await expect(
      service.capture({
        fullName: ' ',
        company: 'Noi That An Phat',
        email: 'an@example.com',
        message: 'Can tu van CRM.',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects when both email and phone are missing', async () => {
    const service = new LeadCaptureService(createPrisma(), auditLog as any);

    await expect(
      service.capture({
        fullName: 'Nguyen Minh An',
        company: 'Noi That An Phat',
        message: 'Can tu van CRM.',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('validates invalid email format in the DTO', () => {
    const dto = plainToInstance(LeadCaptureDto, {
      fullName: 'Nguyen Minh An',
      company: 'Noi That An Phat',
      email: 'not-an-email',
      message: 'Can tu van CRM.',
    });

    const errors = validateSync(dto);

    expect(errors.some((error) => error.property === 'email')).toBe(true);
  });

  it('ignores client-controlled system fields and keeps Website source/status', async () => {
    const prisma = createPrisma();
    const service = new LeadCaptureService(prisma, auditLog as any);

    await service.capture({
      fullName: 'Nguyen Minh An',
      company: 'Noi That An Phat',
      phone: '0908456789',
      message: 'Can tu van CRM.',
      organizationId: 'other-org',
      ownerId: 'other-user',
      source: 'Facebook',
      status: 'CONVERTED',
    } as any);

    expect(prisma.lead.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG,
        ownerId: OWNER,
        source: 'Website',
        status: LeadStatus.NEW,
      }),
    });
  });

  it('returns fake success and does not create a lead when honeypot is filled', async () => {
    const prisma = createPrisma();
    const service = new LeadCaptureService(prisma, auditLog as any);

    const result = await service.capture({
      fullName: 'Bot Lead',
      company: 'Spam Co',
      email: 'bot@example.com',
      message: 'Spam',
      companyFaxHidden: 'filled by bot',
    });

    expect(result.message).toContain('Cảm ơn bạn');
    expect(result.leadId).toBeUndefined();
    expect(prisma.lead.create).not.toHaveBeenCalled();
  });

  it('rejects when the configured owner does not belong to the organization', async () => {
    const prisma = createPrisma();
    prisma.user.findFirst.mockImplementation(({ where }: any) => {
      if (where?.email) return Promise.resolve(null);
      return Promise.resolve(null);
    });
    const service = new LeadCaptureService(prisma, auditLog as any);

    await expect(
      service.capture({
        fullName: 'Nguyen Minh An',
        company: 'Noi That An Phat',
        email: 'an@example.com',
        message: 'Can tu van CRM.',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('falls back to the default public lead owner email when public lead IDs are missing', async () => {
    process.env.PUBLIC_LEAD_ORGANIZATION_ID = '';
    process.env.PUBLIC_LEAD_OWNER_ID = '';
    const prisma = createPrisma();
    const service = new LeadCaptureService(prisma, auditLog as any);

    await service.capture({
      fullName: 'Nguyen Minh An',
      company: 'Noi That An Phat',
      email: 'an@example.com',
      message: 'Can tu van CRM.',
    });

    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ email: 'admin@example.com' }),
      }),
    );
    expect(prisma.lead.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG,
        ownerId: OWNER,
      }),
    });
  });

  it('falls back to PUBLIC_LEAD_OWNER_EMAIL when public lead IDs are stale after reseed', async () => {
    process.env.PUBLIC_LEAD_ORGANIZATION_ID = 'old-org';
    process.env.PUBLIC_LEAD_OWNER_ID = 'old-owner';
    process.env.PUBLIC_LEAD_OWNER_EMAIL = 'admin@example.com';
    const prisma = createPrisma();
    prisma.organization.findUnique.mockImplementation(({ where }: any) =>
      Promise.resolve(where?.id === ORG ? { id: ORG } : null),
    );
    prisma.user.findFirst.mockImplementation(({ where }: any) => {
      if (where?.email === 'admin@example.com') {
        return Promise.resolve({ id: OWNER, organizationId: ORG });
      }
      if (where?.id === OWNER && where?.organizationId === ORG) {
        return Promise.resolve({ id: OWNER, organizationId: ORG });
      }
      return Promise.resolve(null);
    });
    const service = new LeadCaptureService(prisma, auditLog as any);

    await service.capture({
      fullName: 'Nguyen Minh An',
      company: 'Noi That An Phat',
      phone: '0908456789',
      message: 'Can tu van CRM.',
    });

    expect(prisma.lead.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG,
        ownerId: OWNER,
      }),
    });
  });
});
