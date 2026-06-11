import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Contract,
  ContractStatus,
  Prisma,
  Product,
  ProductPackage,
  Quote,
  QuoteStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AuditAction, AuditLogService } from '../../../../infrastructure/audit/audit-log.service';
import { TokenPayload } from '../../../../infrastructure/security/token.service';
import { ownerVisibilityWhere } from '../../../../common/security/record-visibility';
import { StorageService } from '../../../../shared/storage/storage.service';
import {
  AddOpportunityPackageDto,
  AddOpportunityProductDto,
  ContractResponseDto,
  CreateContractDto,
  CreateQuoteDto,
  OpportunityProductResponseDto,
  ProductPackageResponseDto,
  ProductResponseDto,
  QuoteResponseDto,
} from '../dto/sales-document.dto';

type SalesUser = Pick<TokenPayload, 'sub' | 'organizationId' | 'role'>;

const toNumber = (value: Prisma.Decimal | number | string | null | undefined) =>
  value === null || value === undefined ? 0 : Number(value.toString());

const money = (value: number) => new Prisma.Decimal(value.toFixed(2));

const clampText = (value?: string | null) => value?.trim() || undefined;

@Injectable()
export class OpportunitySalesService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private auditLog: AuditLogService,
  ) {}

  async findProducts(user: SalesUser): Promise<ProductResponseDto[]> {
    const products = await this.prisma.product.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    return products.map((product) => this.mapProduct(product));
  }

  async findPackages(user: SalesUser): Promise<ProductPackageResponseDto[]> {
    const packages = await this.prisma.productPackage.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      include: {
        items: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return packages.map((item) => this.mapPackage(item));
  }

  async findOpportunityProducts(
    opportunityId: string,
    user: SalesUser,
  ): Promise<OpportunityProductResponseDto[]> {
    await this.assertOpportunityVisible(opportunityId, user);

    const rows = await this.prisma.opportunityProduct.findMany({
      where: { organizationId: user.organizationId, opportunityId },
      include: { product: true },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((row) => this.mapOpportunityProduct(row));
  }

  async addOpportunityProduct(
    opportunityId: string,
    user: SalesUser,
    dto: AddOpportunityProductDto,
  ): Promise<OpportunityProductResponseDto> {
    await this.assertOpportunityVisible(opportunityId, user);
    const product = await this.assertProduct(dto.productId, user.organizationId);
    const quantity = Number(dto.quantity);
    const unitPrice = dto.unitPrice !== undefined
      ? Number(dto.unitPrice)
      : toNumber(product.defaultPrice);
    const discountAmount = dto.discountAmount !== undefined
      ? Number(dto.discountAmount)
      : 0;
    const lineTotal = this.calculateLineTotal(quantity, unitPrice, discountAmount);

    const row = await this.prisma.opportunityProduct.create({
      data: {
        id: randomUUID(),
        organizationId: user.organizationId,
        opportunityId,
        productId: product.id,
        quantity: money(quantity),
        unitPrice: money(unitPrice),
        discountAmount: money(discountAmount),
        lineTotal: money(lineTotal),
      },
      include: { product: true },
    });

    await this.auditLog.log({
      organizationId: user.organizationId,
      userId: user.sub,
      action: AuditAction.CREATE,
      entityType: 'OpportunityProduct',
      entityId: row.id,
      newValues: { opportunityId, productId: product.id, quantity, lineTotal },
    });

    return this.mapOpportunityProduct(row);
  }

  async addPackage(
    opportunityId: string,
    user: SalesUser,
    dto: AddOpportunityPackageDto,
  ): Promise<OpportunityProductResponseDto[]> {
    await this.assertOpportunityVisible(opportunityId, user);
    const productPackage = await this.prisma.productPackage.findFirst({
      where: {
        id: dto.packageId,
        organizationId: user.organizationId,
        isActive: true,
      },
      include: { items: { include: { product: true }, orderBy: { sortOrder: 'asc' } } },
    });

    if (!productPackage) {
      throw new NotFoundException('Không tìm thấy gói sản phẩm.');
    }

    const created = await this.prisma.$transaction(
      productPackage.items.map((item) => {
        const quantity = toNumber(item.quantity);
        const unitPrice = item.unitPrice
          ? toNumber(item.unitPrice)
          : toNumber(item.product.defaultPrice);
        const lineTotal = this.calculateLineTotal(quantity, unitPrice, 0);

        return this.prisma.opportunityProduct.create({
          data: {
            id: randomUUID(),
            organizationId: user.organizationId,
            opportunityId,
            productId: item.productId,
            quantity: money(quantity),
            unitPrice: money(unitPrice),
            discountAmount: money(0),
            lineTotal: money(lineTotal),
          },
          include: { product: true },
        });
      }),
    );

    await this.auditLog.log({
      organizationId: user.organizationId,
      userId: user.sub,
      action: AuditAction.CREATE,
      entityType: 'OpportunityProductPackage',
      entityId: productPackage.id,
      newValues: {
        opportunityId,
        packageId: productPackage.id,
        itemCount: created.length,
      },
    });

    return created.map((row) => this.mapOpportunityProduct(row));
  }

  async removeOpportunityProduct(
    opportunityId: string,
    rowId: string,
    user: SalesUser,
  ) {
    await this.assertOpportunityVisible(opportunityId, user);
    const row = await this.prisma.opportunityProduct.findFirst({
      where: { id: rowId, opportunityId, organizationId: user.organizationId },
    });

    if (!row) {
      throw new NotFoundException('Không tìm thấy sản phẩm trong cơ hội.');
    }

    await this.prisma.opportunityProduct.delete({ where: { id: row.id } });
    await this.auditLog.log({
      organizationId: user.organizationId,
      userId: user.sub,
      action: AuditAction.SOFT_DELETE,
      entityType: 'OpportunityProduct',
      entityId: row.id,
      oldValues: { opportunityId, productId: row.productId },
    });

    return { message: 'Đã xóa sản phẩm khỏi cơ hội.' };
  }

  async findQuotes(
    opportunityId: string,
    user: SalesUser,
  ): Promise<QuoteResponseDto[]> {
    await this.assertOpportunityVisible(opportunityId, user);
    const quotes = await this.prisma.quote.findMany({
      where: { opportunityId, organizationId: user.organizationId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(quotes.map((quote) => this.mapQuote(quote)));
  }

  async createQuote(
    opportunityId: string,
    user: SalesUser,
    dto: CreateQuoteDto,
  ): Promise<QuoteResponseDto> {
    const opportunity = await this.assertOpportunityVisible(opportunityId, user);
    const products = await this.prisma.opportunityProduct.findMany({
      where: { opportunityId, organizationId: user.organizationId },
      include: { product: true },
      orderBy: { createdAt: 'asc' },
    });

    if (products.length === 0) {
      throw new BadRequestException('Vui lòng thêm sản phẩm trước khi tạo báo giá.');
    }

    const quoteId = randomUUID();
    const quoteNumber = await this.nextCode(user.organizationId, 'Q');
    const totalAmount = products.reduce((sum, item) => sum + toNumber(item.lineTotal), 0);

    const quote = await this.prisma.quote.create({
      data: {
        id: quoteId,
        organizationId: user.organizationId,
        opportunityId,
        accountId: opportunity.accountId,
        contactId: opportunity.contactId,
        ownerId: user.sub,
        quoteNumber,
        totalAmount: money(totalAmount),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        notes: clampText(dto.notes),
        paymentTerms: clampText(dto.paymentTerms),
        items: {
          create: products.map((item) => ({
            id: randomUUID(),
            productId: item.productId,
            productName: item.product.name,
            productCode: item.product.code,
            unit: item.product.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount,
            lineTotal: item.lineTotal,
          })),
        },
      },
      include: { items: true },
    });

    await this.auditLog.log({
      organizationId: user.organizationId,
      userId: user.sub,
      action: AuditAction.CREATE,
      entityType: 'Quote',
      entityId: quote.id,
      newValues: { opportunityId, quoteNumber, totalAmount },
    });

    return this.mapQuote(quote);
  }

  async updateQuoteStatus(
    opportunityId: string,
    quoteId: string,
    status: QuoteStatus,
    user: SalesUser,
  ): Promise<QuoteResponseDto> {
    await this.assertOpportunityVisible(opportunityId, user);
    const quote = await this.assertQuote(opportunityId, quoteId, user);
    const updated = await this.prisma.quote.update({
      where: { id: quote.id },
      data: { status },
      include: { items: true },
    });

    await this.auditLog.log({
      organizationId: user.organizationId,
      userId: user.sub,
      action: AuditAction.UPDATE,
      entityType: 'Quote',
      entityId: quote.id,
      oldValues: { status: quote.status },
      newValues: { status },
    });

    return this.mapQuote(updated);
  }

  async generateQuotePdf(
    opportunityId: string,
    quoteId: string,
    user: SalesUser,
  ): Promise<QuoteResponseDto> {
    const opportunity = await this.assertOpportunityVisible(opportunityId, user);
    const quote = await this.assertQuote(opportunityId, quoteId, user);
    const account = await this.prisma.account.findUnique({ where: { id: quote.accountId } });
    const contact = quote.contactId
      ? await this.prisma.contact.findUnique({ where: { id: quote.contactId } })
      : null;
    const pdfBuffer = this.buildPdf([
      `BAO GIA ${quote.quoteNumber}`,
      `Co hoi: ${opportunity.name}`,
      `Khach hang: ${account?.name || ''}`,
      `Lien he: ${[contact?.firstName, contact?.lastName].filter(Boolean).join(' ')}`,
      `Tong tien: ${toNumber(quote.totalAmount).toLocaleString('vi-VN')} VND`,
      'San pham / dich vu:',
      ...quote.items.map(
        (item) =>
          `- ${item.productName} x ${toNumber(item.quantity)} = ${toNumber(item.lineTotal).toLocaleString('vi-VN')} VND`,
      ),
      `Ghi chu: ${quote.notes || '-'}`,
      `Dieu khoan thanh toan: ${quote.paymentTerms || '-'}`,
    ]);
    const fileName = `${quote.quoteNumber}.pdf`;
    const storagePath = this.storageService.buildSalesDocumentPath({
      organizationId: user.organizationId,
      opportunityId,
      documentType: 'quotes',
      documentId: quote.id,
      originalName: fileName,
    });

    await this.storageService.uploadFile({
      originalname: fileName,
      mimetype: 'application/pdf',
      size: pdfBuffer.length,
      buffer: pdfBuffer,
    }, storagePath);

    const updated = await this.prisma.quote.update({
      where: { id: quote.id },
      data: {
        pdfFileName: fileName,
        pdfStorageBucket: this.storageService.getBucket(),
        pdfStoragePath: storagePath,
        pdfGeneratedAt: new Date(),
      },
      include: { items: true },
    });

    return this.mapQuote(updated);
  }

  async getQuotePdfSignedUrl(
    opportunityId: string,
    quoteId: string,
    user: SalesUser,
  ): Promise<{ signedUrl: string }> {
    await this.assertOpportunityVisible(opportunityId, user);
    const quote = await this.assertQuote(opportunityId, quoteId, user);

    if (!quote.pdfStoragePath) {
      throw new BadRequestException('Báo giá chưa có file PDF.');
    }

    return {
      signedUrl: await this.storageService.createSignedUrl(quote.pdfStoragePath),
    };
  }

  async findContracts(
    opportunityId: string,
    user: SalesUser,
  ): Promise<ContractResponseDto[]> {
    await this.assertOpportunityVisible(opportunityId, user);
    const contracts = await this.prisma.contract.findMany({
      where: { opportunityId, organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(contracts.map((contract) => this.mapContract(contract)));
  }

  async createContract(
    opportunityId: string,
    user: SalesUser,
    dto: CreateContractDto,
  ): Promise<ContractResponseDto> {
    const opportunity = await this.assertOpportunityVisible(opportunityId, user);
    const quote = await this.assertQuote(opportunityId, dto.quoteId, user);

    if (quote.status !== QuoteStatus.ACCEPTED) {
      throw new BadRequestException('Chỉ có thể tạo hợp đồng từ báo giá đã chấp nhận.');
    }

    const contractNumber = await this.nextCode(user.organizationId, 'C');
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const contract = await this.prisma.contract.create({
      data: {
        id: randomUUID(),
        organizationId: user.organizationId,
        opportunityId,
        quoteId: quote.id,
        accountId: quote.accountId,
        contactId: quote.contactId,
        ownerId: user.sub,
        contractNumber,
        name: clampText(dto.name) || `Hợp đồng ${opportunity.name}`,
        totalAmount: quote.totalAmount,
        startDate,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        paymentTerms: clampText(dto.paymentTerms) || quote.paymentTerms,
        terms: clampText(dto.terms),
      },
    });

    await this.auditLog.log({
      organizationId: user.organizationId,
      userId: user.sub,
      action: AuditAction.CREATE,
      entityType: 'Contract',
      entityId: contract.id,
      newValues: { opportunityId, quoteId: quote.id, contractNumber },
    });

    return this.mapContract(contract);
  }

  async generateContractPdf(
    opportunityId: string,
    contractId: string,
    user: SalesUser,
  ): Promise<ContractResponseDto> {
    const opportunity = await this.assertOpportunityVisible(opportunityId, user);
    const contract = await this.assertContract(opportunityId, contractId, user);
    const quote = await this.prisma.quote.findUnique({
      where: { id: contract.quoteId },
      include: { items: true },
    });
    const account = await this.prisma.account.findUnique({ where: { id: contract.accountId } });
    const pdfBuffer = this.buildPdf([
      `HOP DONG ${contract.contractNumber}`,
      `Ten hop dong: ${contract.name}`,
      `Co hoi: ${opportunity.name}`,
      `Khach hang: ${account?.name || ''}`,
      `Bao gia: ${quote?.quoteNumber || ''}`,
      `Tong gia tri: ${toNumber(contract.totalAmount).toLocaleString('vi-VN')} VND`,
      `Hieu luc tu: ${contract.startDate.toISOString().slice(0, 10)}`,
      `Dieu khoan thanh toan: ${contract.paymentTerms || '-'}`,
      'Danh sach san pham / dich vu:',
      ...(quote?.items || []).map(
        (item) =>
          `- ${item.productName} x ${toNumber(item.quantity)} = ${toNumber(item.lineTotal).toLocaleString('vi-VN')} VND`,
      ),
      `Noi dung / dieu khoan: ${contract.terms || '-'}`,
      'Chu ky ben cung cap: ____________________',
      'Chu ky khach hang: ______________________',
    ]);
    const fileName = `${contract.contractNumber}.pdf`;
    const storagePath = this.storageService.buildSalesDocumentPath({
      organizationId: user.organizationId,
      opportunityId,
      documentType: 'contracts',
      documentId: contract.id,
      originalName: fileName,
    });

    await this.storageService.uploadFile({
      originalname: fileName,
      mimetype: 'application/pdf',
      size: pdfBuffer.length,
      buffer: pdfBuffer,
    }, storagePath);

    const updated = await this.prisma.contract.update({
      where: { id: contract.id },
      data: {
        status: ContractStatus.PDF_GENERATED,
        pdfFileName: fileName,
        pdfStorageBucket: this.storageService.getBucket(),
        pdfStoragePath: storagePath,
        pdfGeneratedAt: new Date(),
      },
    });

    return this.mapContract(updated);
  }

  async getContractPdfSignedUrl(
    opportunityId: string,
    contractId: string,
    user: SalesUser,
  ): Promise<{ signedUrl: string }> {
    await this.assertOpportunityVisible(opportunityId, user);
    const contract = await this.assertContract(opportunityId, contractId, user);

    if (!contract.pdfStoragePath) {
      throw new BadRequestException('Hợp đồng chưa có file PDF.');
    }

    return {
      signedUrl: await this.storageService.createSignedUrl(contract.pdfStoragePath),
    };
  }

  private async assertOpportunityVisible(opportunityId: string, user: SalesUser) {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: {
        id: opportunityId,
        organizationId: user.organizationId,
        deletedAt: null,
        ...ownerVisibilityWhere(user),
      },
    });

    if (!opportunity) {
      throw new NotFoundException('Không tìm thấy cơ hội bán hàng.');
    }

    return opportunity;
  }

  private async assertProduct(productId: string, organizationId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId, isActive: true },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm.');
    }

    return product;
  }

  private async assertQuote(opportunityId: string, quoteId: string, user: SalesUser) {
    const quote = await this.prisma.quote.findFirst({
      where: {
        id: quoteId,
        opportunityId,
        organizationId: user.organizationId,
      },
      include: { items: true },
    });

    if (!quote) {
      throw new NotFoundException('Không tìm thấy báo giá.');
    }

    return quote;
  }

  private async assertContract(
    opportunityId: string,
    contractId: string,
    user: SalesUser,
  ) {
    const contract = await this.prisma.contract.findFirst({
      where: {
        id: contractId,
        opportunityId,
        organizationId: user.organizationId,
      },
    });

    if (!contract) {
      throw new NotFoundException('Không tìm thấy hợp đồng.');
    }

    return contract;
  }

  private calculateLineTotal(quantity: number, unitPrice: number, discountAmount: number) {
    if (quantity <= 0) {
      throw new BadRequestException('Số lượng phải lớn hơn 0.');
    }
    if (unitPrice < 0 || discountAmount < 0) {
      throw new BadRequestException('Đơn giá và giảm giá không được âm.');
    }

    return Math.max(quantity * unitPrice - discountAmount, 0);
  }

  private async nextCode(organizationId: string, prefix: 'Q' | 'C') {
    const today = new Date();
    const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
    const model = prefix === 'Q' ? this.prisma.quote : this.prisma.contract;
    const count = await (model as any).count({ where: { organizationId } });
    return `${prefix}-${datePart}-${String(count + 1).padStart(4, '0')}`;
  }

  private mapProduct(product: Product): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      code: product.code,
      type: product.type,
      unit: product.unit || undefined,
      defaultPrice: toNumber(product.defaultPrice),
      description: product.description || undefined,
      isActive: product.isActive,
    };
  }

  private mapPackage(productPackage: ProductPackage & { items: any[] }): ProductPackageResponseDto {
    return {
      id: productPackage.id,
      name: productPackage.name,
      code: productPackage.code,
      description: productPackage.description || undefined,
      isActive: productPackage.isActive,
      items: productPackage.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productCode: item.product.code,
        quantity: toNumber(item.quantity),
        unitPrice: item.unitPrice ? toNumber(item.unitPrice) : undefined,
      })),
    };
  }

  private mapOpportunityProduct(row: any): OpportunityProductResponseDto {
    return {
      id: row.id,
      opportunityId: row.opportunityId,
      productId: row.productId,
      productName: row.product?.name || '',
      productCode: row.product?.code || '',
      unit: row.product?.unit || undefined,
      quantity: toNumber(row.quantity),
      unitPrice: toNumber(row.unitPrice),
      discountAmount: toNumber(row.discountAmount),
      lineTotal: toNumber(row.lineTotal),
      createdAt: row.createdAt,
    };
  }

  private async mapQuote(quote: Quote & { items: any[] }): Promise<QuoteResponseDto> {
    return {
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      status: quote.status,
      totalAmount: toNumber(quote.totalAmount),
      expiresAt: quote.expiresAt || undefined,
      notes: quote.notes || undefined,
      paymentTerms: quote.paymentTerms || undefined,
      pdfGeneratedAt: quote.pdfGeneratedAt || undefined,
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt,
      items: quote.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productCode: item.productCode,
        unit: item.unit || undefined,
        quantity: toNumber(item.quantity),
        unitPrice: toNumber(item.unitPrice),
        discountAmount: toNumber(item.discountAmount),
        lineTotal: toNumber(item.lineTotal),
      })),
    };
  }

  private async mapContract(contract: Contract): Promise<ContractResponseDto> {
    return {
      id: contract.id,
      contractNumber: contract.contractNumber,
      name: contract.name,
      status: contract.status,
      quoteId: contract.quoteId,
      totalAmount: toNumber(contract.totalAmount),
      startDate: contract.startDate,
      endDate: contract.endDate || undefined,
      paymentTerms: contract.paymentTerms || undefined,
      terms: contract.terms || undefined,
      pdfGeneratedAt: contract.pdfGeneratedAt || undefined,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
    };
  }

  private buildPdf(lines: string[]) {
    const sanitizedLines = lines.map((line) =>
      line
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]/g, ''),
    );
    const text = sanitizedLines
      .map((line, index) => `BT /F1 11 Tf 50 ${780 - index * 18} Td (${this.escapePdf(line)}) Tj ET`)
      .join('\n');
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      `5 0 obj << /Length ${Buffer.byteLength(text)} >> stream\n${text}\nendstream endobj`,
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (const object of objects) {
      offsets.push(Buffer.byteLength(pdf));
      pdf += `${object}\n`;
    }
    const xref = Buffer.byteLength(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i < offsets.length; i += 1) {
      pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer << /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xref}\n%%EOF`;
    return Buffer.from(pdf, 'utf8');
  }

  private escapePdf(value: string) {
    return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }
}
