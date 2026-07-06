import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, QuoteStatus, UserRole } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { buildQuotePdfFileName, OpportunitySalesService } from './opportunity-sales.service';

describe('OpportunitySalesService quote names', () => {
  const user = {
    sub: 'owner-1',
    organizationId: 'org-1',
    role: UserRole.SALES,
  };
  const opportunity = {
    id: 'opp-1',
    organizationId: 'org-1',
    ownerId: user.sub,
    accountId: 'account-1',
    contactId: null,
    name: 'Cơ hội nhượng quyền',
    deletedAt: null,
  };
  const productRow = {
    id: 'row-1',
    opportunityId: opportunity.id,
    productId: 'product-1',
    quantity: new Prisma.Decimal(2),
    unitPrice: new Prisma.Decimal(70_000_000),
    discountAmount: new Prisma.Decimal(0),
    lineTotal: new Prisma.Decimal(140_000_000),
    createdAt: new Date(),
    product: {
      id: 'product-1',
      name: 'Gói tiêu chuẩn',
      code: 'PKG-STD',
      unit: 'gói',
    },
  };

  const makeQuote = (overrides: Record<string, unknown> = {}) => ({
    id: 'quote-1',
    organizationId: 'org-1',
    opportunityId: opportunity.id,
    accountId: opportunity.accountId,
    contactId: null,
    ownerId: user.sub,
    quoteNumber: 'Q-20260706-0001',
    name: 'Báo giá gói tiêu chuẩn',
    status: QuoteStatus.DRAFT,
    totalAmount: new Prisma.Decimal(140_000_000),
    expiresAt: null,
    notes: null,
    paymentTerms: null,
    pdfFileName: null,
    pdfStorageBucket: null,
    pdfStoragePath: null,
    pdfGeneratedAt: null,
    canceledAt: null,
    canceledById: null,
    deletedAt: null,
    deletedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: 'item-1',
        productId: productRow.productId,
        productName: productRow.product.name,
        productCode: productRow.product.code,
        unit: productRow.product.unit,
        quantity: productRow.quantity,
        unitPrice: productRow.unitPrice,
        discountAmount: productRow.discountAmount,
        lineTotal: productRow.lineTotal,
      },
    ],
    contracts: [],
    ...overrides,
  });

  const setup = (quote = makeQuote()) => {
    const prisma = {
      opportunity: { findFirst: jest.fn().mockResolvedValue(opportunity) },
      opportunityProduct: { findMany: jest.fn().mockResolvedValue([productRow]) },
      quote: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([quote]),
        findFirst: jest.fn().mockResolvedValue(quote),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve(
            makeQuote({
              id: data.id,
              name: data.name,
              quoteNumber: data.quoteNumber,
              totalAmount: data.totalAmount,
            })
          )
        ),
        update: jest
          .fn()
          .mockImplementation(({ data }) => Promise.resolve(makeQuote({ ...quote, ...data }))),
      },
      account: { findUnique: jest.fn().mockResolvedValue({ id: 'account-1', name: 'ACME' }) },
      contact: { findUnique: jest.fn().mockResolvedValue(null) },
      organization: {
        findUnique: jest.fn().mockResolvedValue({ id: 'org-1', name: 'CRM Việt Nam' }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: user.sub,
          firstName: 'An',
          lastName: 'Nguyễn',
          email: 'an@example.com',
        }),
      },
      contract: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
      },
    };
    const storage = {
      buildSalesDocumentPath: jest.fn().mockReturnValue('safe/storage/path.pdf'),
      uploadFile: jest.fn().mockResolvedValue(undefined),
      getBucket: jest.fn().mockReturnValue('private'),
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new OpportunitySalesService(prisma as any, storage as any, audit as any);
    return { service, prisma, storage, audit };
  };

  afterEach(() => jest.clearAllMocks());

  it('creates a quote with a trimmed name and unchanged snapshot total', async () => {
    const { service, prisma } = setup();
    const result = await service.createQuote(opportunity.id, user, {
      name: '  Báo giá gói tiêu chuẩn  ',
    });

    expect(result.name).toBe('Báo giá gói tiêu chuẩn');
    expect(result.quoteNumber).toBe('Q-20260706-0001');
    expect(result.totalAmount).toBe(140_000_000);
    expect(prisma.quote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Báo giá gói tiêu chuẩn',
          quoteNumber: 'Q-20260706-0001',
          totalAmount: expect.any(Prisma.Decimal),
        }),
      })
    );
  });

  it('ignores a client-supplied quoteNumber and still generates it on the backend', async () => {
    const { service, prisma } = setup();
    await service.createQuote(opportunity.id, user, {
      name: 'Báo giá hợp lệ',
      quoteNumber: 'CLIENT-CODE',
    } as any);

    expect(prisma.quote.create.mock.calls[0][0].data.quoteNumber).toBe('Q-20260706-0001');
  });

  it('returns both name and quoteNumber in the API mapping', async () => {
    const { service } = setup();
    const result = await service.findQuotes(opportunity.id, user);
    expect(result[0]).toEqual(
      expect.objectContaining({
        name: 'Báo giá gói tiêu chuẩn',
        quoteNumber: 'Q-20260706-0001',
      })
    );
  });

  it('renames an editable draft quote and writes an audit entry', async () => {
    const { service, prisma, audit } = setup();
    const result = await service.updateQuote(opportunity.id, 'quote-1', user, {
      name: '  Báo giá lần 2  ',
    });

    expect(prisma.quote.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: 'Báo giá lần 2' } })
    );
    expect(result.name).toBe('Báo giá lần 2');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        oldValues: { name: 'Báo giá gói tiêu chuẩn' },
        newValues: { name: 'Báo giá lần 2' },
      })
    );
  });

  it('does not expose a quote from another organization', async () => {
    const { service, prisma } = setup();
    prisma.opportunity.findFirst.mockResolvedValue(null);
    await expect(
      service.updateQuote(opportunity.id, 'quote-1', user, { name: 'Tên mới' })
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.quote.update).not.toHaveBeenCalled();
  });

  it.each([UserRole.SALES, UserRole.SUPPORT])(
    'does not allow %s to rename another owner quote',
    async (role) => {
      const { service } = setup(makeQuote({ ownerId: 'owner-2' }));
      await expect(
        service.updateQuote(
          opportunity.id,
          'quote-1',
          { ...user, role },
          { name: 'Tên mới' }
        )
      ).rejects.toBeInstanceOf(ForbiddenException);
    }
  );

  it.each([
    [QuoteStatus.SENT, null],
    [QuoteStatus.ACCEPTED, null],
    [QuoteStatus.CANCELLED, null],
    [QuoteStatus.DRAFT, new Date()],
  ])('locks rename for finalized quote state %s', async (status, pdfGeneratedAt) => {
    const { service } = setup(makeQuote({ status, pdfGeneratedAt }));
    await expect(
      service.updateQuote(opportunity.id, 'quote-1', user, { name: 'Tên mới' })
    ).rejects.toBeInstanceOf(
      status === QuoteStatus.CANCELLED ? NotFoundException : BadRequestException
    );
  });

  it('keeps accepted quote total when creating a contract', async () => {
    const accepted = makeQuote({ status: QuoteStatus.ACCEPTED });
    const { service, prisma } = setup(accepted);
    prisma.contract.create.mockImplementation(({ data }) =>
      Promise.resolve({
        ...data,
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    await service.createContract(opportunity.id, user, {
      quoteId: accepted.id as string,
      name: 'Hợp đồng kiểm thử',
    });
    expect(prisma.contract.create.mock.calls[0][0].data.totalAmount).toBe(accepted.totalAmount);
  });

  it('generates a sanitized filename containing the immutable quote number', async () => {
    expect(
      buildQuotePdfFileName('../../Báo giá gói nhượng quyền: Quận 1?', 'Q-20260706-0026')
    ).toBe('Bao-gia-goi-nhuong-quyen-Quan-1-Q-20260706-0026.pdf');
    expect(buildQuotePdfFileName('***', 'Q-20260706-0026')).toBe('Bao-gia-Q-20260706-0026.pdf');
  });

  it('uses the safe business filename when storing a generated PDF', async () => {
    const { service, storage } = setup();
    (service as any).buildQuotePdf = jest.fn().mockResolvedValue(Buffer.from('pdf'));
    await service.generateQuotePdf(opportunity.id, 'quote-1', user);

    expect(storage.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        originalname: 'Bao-gia-goi-tieu-chuan-Q-20260706-0001.pdf',
      }),
      'safe/storage/path.pdf'
    );
  });

  it('migration backfills old quotes before making name required', () => {
    const sql = readFileSync(
      join(process.cwd(), 'prisma', 'migrations', '20260706000100_add_quote_name', 'migration.sql'),
      'utf8'
    );
    expect(sql).toContain(`'Báo giá ' || "quote_number"`);
    expect(sql.indexOf('UPDATE "quotes"')).toBeLessThan(
      sql.indexOf('ALTER COLUMN "name" SET NOT NULL')
    );
  });

  it('quote PDF template contains both the business name and system code', () => {
    const source = readFileSync(join(__dirname, 'opportunity-sales.service.ts'), 'utf8');
    expect(source).toContain('.text(quote.name');
    expect(source).toContain('`Mã báo giá: ${quote.quoteNumber}`');
  });
});
