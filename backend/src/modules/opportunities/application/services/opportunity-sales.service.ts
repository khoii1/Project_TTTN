import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Contract,
  ContractStatus,
  Account,
  Contact,
  Organization,
  Opportunity,
  Prisma,
  Product,
  ProductPackage,
  Quote,
  QuoteItem,
  QuoteStatus,
  User,
  UserRole,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { join } from 'path';
import PDFDocument = require('pdfkit');
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
    const unitPrice = dto.unitPrice !== undefined && dto.unitPrice !== null
      ? Number(dto.unitPrice)
      : toNumber(product.defaultPrice);
    const discountAmount = dto.discountAmount !== undefined && dto.discountAmount !== null
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
        const unitPrice = item.unitPrice !== null && item.unitPrice !== undefined
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
    options: { includeArchived?: boolean; includeCanceled?: boolean } = {},
  ): Promise<QuoteResponseDto[]> {
    await this.assertOpportunityVisible(opportunityId, user);
    const quotes = await this.prisma.quote.findMany({
      where: {
        opportunityId,
        organizationId: user.organizationId,
        ...(options.includeArchived ? {} : { deletedAt: null }),
        ...(options.includeCanceled ? {} : { status: { not: QuoteStatus.CANCELLED } }),
      },
      include: { items: true, contracts: true },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(quotes.map((quote) => this.mapQuote(quote)));
  }

  async deleteQuote(
    opportunityId: string,
    quoteId: string,
    user: SalesUser,
  ): Promise<{ message: string }> {
    await this.assertOpportunityVisible(opportunityId, user);
    const quote = await this.assertQuote(opportunityId, quoteId, user);
    this.assertCanManageDocument(user, quote.ownerId);

    if (quote.deletedAt || quote.status === QuoteStatus.CANCELLED) {
      throw new NotFoundException('Không tìm thấy báo giá.');
    }

    const canSoftDeleteDraft =
      quote.status === QuoteStatus.DRAFT &&
      !quote.pdfGeneratedAt &&
      quote.contracts.length === 0;

    if (!canSoftDeleteDraft) {
      throw new BadRequestException(
        'Báo giá đã phát sinh lịch sử. Vui lòng hủy báo giá thay vì xóa.',
      );
    }

    await this.prisma.quote.update({
      where: { id: quote.id },
      data: {
        deletedAt: new Date(),
        deletedById: user.sub,
      },
    });

    await this.auditLog.log({
      organizationId: user.organizationId,
      userId: user.sub,
      action: AuditAction.SOFT_DELETE,
      entityType: 'Quote',
      entityId: quote.id,
      oldValues: { status: quote.status, quoteNumber: quote.quoteNumber },
    });

    return { message: 'Đã xóa báo giá nháp.' };
  }

  async cancelQuote(
    opportunityId: string,
    quoteId: string,
    user: SalesUser,
  ): Promise<QuoteResponseDto> {
    await this.assertOpportunityVisible(opportunityId, user);
    const quote = await this.assertQuote(opportunityId, quoteId, user);
    this.assertCanManageDocument(user, quote.ownerId);

    if (quote.deletedAt) {
      throw new NotFoundException('Không tìm thấy báo giá.');
    }

    if (quote.status === QuoteStatus.CANCELLED) {
      return this.mapQuote(quote);
    }

    const updated = await this.prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: QuoteStatus.CANCELLED,
        canceledAt: new Date(),
        canceledById: user.sub,
      },
      include: { items: true, contracts: true },
    });

    await this.auditLog.log({
      organizationId: user.organizationId,
      userId: user.sub,
      action: AuditAction.STATUS_CHANGE,
      entityType: 'Quote',
      entityId: quote.id,
      oldValues: { status: quote.status },
      newValues: { status: QuoteStatus.CANCELLED },
    });

    return this.mapQuote(updated);
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
      include: { items: true, contracts: true },
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
    if (quote.deletedAt || quote.status === QuoteStatus.CANCELLED) {
      throw new BadRequestException('Không thể cập nhật báo giá đã xóa hoặc đã hủy.');
    }
    if (status === QuoteStatus.CANCELLED) {
      throw new BadRequestException('Vui lòng dùng chức năng hủy báo giá.');
    }
    const updated = await this.prisma.quote.update({
      where: { id: quote.id },
      data: { status },
      include: { items: true, contracts: true },
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
    if (quote.deletedAt || quote.status === QuoteStatus.CANCELLED) {
      throw new BadRequestException('Không thể xuất PDF cho báo giá đã xóa hoặc đã hủy.');
    }
    const account = await this.prisma.account.findUnique({ where: { id: quote.accountId } });
    const contact = quote.contactId
      ? await this.prisma.contact.findUnique({ where: { id: quote.contactId } })
      : null;
    const [organization, owner] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: user.organizationId } }),
      this.prisma.user.findUnique({ where: { id: quote.ownerId } }),
    ]);
    const pdfBuffer = await this.buildQuotePdf({
      quote,
      opportunity,
      account,
      contact,
      organization,
      owner,
    });
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
      include: { items: true, contracts: true },
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

    if (quote.deletedAt) {
      throw new NotFoundException('Không tìm thấy báo giá.');
    }

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
    options: { includeArchived?: boolean; includeCanceled?: boolean } = {},
  ): Promise<ContractResponseDto[]> {
    await this.assertOpportunityVisible(opportunityId, user);
    const contracts = await this.prisma.contract.findMany({
      where: {
        opportunityId,
        organizationId: user.organizationId,
        ...(options.includeArchived ? {} : { deletedAt: null }),
        ...(options.includeCanceled ? {} : { status: { not: ContractStatus.CANCELLED } }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(contracts.map((contract) => this.mapContract(contract)));
  }

  async deleteContract(
    opportunityId: string,
    contractId: string,
    user: SalesUser,
  ): Promise<{ message: string }> {
    await this.assertOpportunityVisible(opportunityId, user);
    const contract = await this.assertContract(opportunityId, contractId, user);
    this.assertCanManageDocument(user, contract.ownerId);

    if (contract.deletedAt) {
      throw new NotFoundException('Không tìm thấy hợp đồng.');
    }

    if (contract.status !== ContractStatus.DRAFT || contract.pdfGeneratedAt) {
      throw new BadRequestException(
        'Hợp đồng đã phát sinh lịch sử. Vui lòng hủy hợp đồng thay vì xóa.',
      );
    }

    await this.prisma.contract.update({
      where: { id: contract.id },
      data: {
        deletedAt: new Date(),
        deletedById: user.sub,
      },
    });

    await this.auditLog.log({
      organizationId: user.organizationId,
      userId: user.sub,
      action: AuditAction.SOFT_DELETE,
      entityType: 'Contract',
      entityId: contract.id,
      oldValues: { status: contract.status, contractNumber: contract.contractNumber },
    });

    return { message: 'Đã xóa hợp đồng nháp.' };
  }

  async cancelContract(
    opportunityId: string,
    contractId: string,
    user: SalesUser,
  ): Promise<ContractResponseDto> {
    await this.assertOpportunityVisible(opportunityId, user);
    const contract = await this.assertContract(opportunityId, contractId, user);
    this.assertCanManageDocument(user, contract.ownerId);

    if (contract.deletedAt) {
      throw new NotFoundException('Không tìm thấy hợp đồng.');
    }

    if (
      (contract.status === ContractStatus.SIGNED ||
        contract.status === ContractStatus.ACTIVE) &&
      !this.isAdminOrManager(user)
    ) {
      throw new ForbiddenException(
        'Chỉ quản trị viên hoặc quản lý được hủy hợp đồng đã ký/đang hiệu lực.',
      );
    }

    if (contract.status === ContractStatus.CANCELLED) {
      return this.mapContract(contract);
    }

    const updated = await this.prisma.contract.update({
      where: { id: contract.id },
      data: {
        status: ContractStatus.CANCELLED,
        canceledAt: new Date(),
        canceledById: user.sub,
      },
    });

    await this.auditLog.log({
      organizationId: user.organizationId,
      userId: user.sub,
      action: AuditAction.STATUS_CHANGE,
      entityType: 'Contract',
      entityId: contract.id,
      oldValues: { status: contract.status },
      newValues: { status: ContractStatus.CANCELLED },
    });

    return this.mapContract(updated);
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
    if (quote.deletedAt) {
      throw new BadRequestException('Không thể tạo hợp đồng từ báo giá đã xóa hoặc đã hủy.');
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
    if (contract.deletedAt || contract.status === ContractStatus.CANCELLED) {
      throw new BadRequestException('Không thể xuất PDF cho hợp đồng đã xóa hoặc đã hủy.');
    }
    const quote = await this.prisma.quote.findUnique({
      where: { id: contract.quoteId },
      include: { items: true },
    });
    if (!quote) {
      throw new NotFoundException('Không tìm thấy báo giá của hợp đồng.');
    }
    const account = await this.prisma.account.findUnique({ where: { id: contract.accountId } });
    const contact = contract.contactId
      ? await this.prisma.contact.findUnique({ where: { id: contract.contactId } })
      : null;
    const [organization, owner] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: user.organizationId } }),
      this.prisma.user.findUnique({ where: { id: contract.ownerId } }),
    ]);
    const pdfBuffer = await this.buildContractPdf({
      contract,
      quote,
      opportunity,
      account,
      contact,
      organization,
      owner,
    });
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

    if (contract.deletedAt) {
      throw new NotFoundException('Không tìm thấy hợp đồng.');
    }

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
      include: { items: true, contracts: true },
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
    if (discountAmount > quantity * unitPrice) {
      throw new BadRequestException('Giảm giá không được lớn hơn tổng tiền dòng sản phẩm.');
    }

    return quantity * unitPrice - discountAmount;
  }

  private isAdminOrManager(user: SalesUser) {
    return user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
  }

  private assertCanManageDocument(user: SalesUser, ownerId: string) {
    if (this.isAdminOrManager(user) || ownerId === user.sub) {
      return;
    }

    throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này.');
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
        unitPrice:
          item.unitPrice !== null && item.unitPrice !== undefined
            ? toNumber(item.unitPrice)
            : undefined,
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

  private async buildQuotePdf(params: {
    quote: Quote & { items: any[] };
    opportunity: Opportunity;
    account: Account | null;
    contact: Contact | null;
    organization: Organization | null;
    owner: User | null;
  }): Promise<Buffer> {
    const { quote, opportunity, account, contact, organization, owner } = params;
    const doc = new PDFDocument({
      size: 'A4',
      margin: 36,
      bufferPages: true,
      autoFirstPage: true,
    });
    this.registerVietnameseFonts(doc);

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    const companyName = organization?.name || 'CRM Pro';
    const contactName = [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') || '-';
    const ownerName = [owner?.firstName, owner?.lastName].filter(Boolean).join(' ') || '-';
    const issueDate = this.formatDateVi(quote.createdAt);
    const expiresText = quote.expiresAt
      ? this.formatDateVi(quote.expiresAt)
      : '14 ngày kể từ ngày ban hành';

    doc.font('NotoSans-Bold').fontSize(12);
    doc.rect(left, 36, 154, 50).stroke('#b7b7b7');
    doc.text('CRM Pro', left, 49, { width: 154, align: 'center' });
    doc.font('NotoSans').fontSize(9).text('Hệ thống quản lý khách hàng', left, 67, {
      width: 154,
      align: 'center',
    });

    doc.rect(left + 158, 36, pageWidth - 158, 50).stroke('#b7b7b7');
    doc.font('NotoSans-Bold').fontSize(10).text(`CÔNG TY: ${companyName}`, left + 170, 43, {
      width: pageWidth - 188,
    });
    doc.font('NotoSans').fontSize(8);
    doc.text('Địa chỉ: -', left + 170, 59, { width: pageWidth - 188 });
    doc.text('Điện thoại / Email: -', left + 170, 73, { width: pageWidth - 188 });

    doc.font('NotoSans-Bold').fontSize(15).text('BẢNG BÁO GIÁ', left, 100, {
      width: pageWidth,
      align: 'center',
    });
    doc.font('NotoSans').fontSize(8.5).text(`Số: ${quote.quoteNumber}`, left, 123, {
      width: pageWidth,
      align: 'center',
    });
    doc.text(`Ngày lập: ${issueDate}`, left, 138, { width: pageWidth, align: 'center' });

    doc.font('NotoSans-Bold').fontSize(10).text(`Kính gửi: ${account?.name || '-'}`, left, 165);
    doc.font('NotoSans').fontSize(9);
    doc.text(`Người liên hệ: ${contactName}`, left, 181);
    doc.text(`Cơ hội: ${opportunity.name}`, left, 197);

    let y = 222;
    y = this.drawQuoteItemsTable(doc, quote.items, left, y, pageWidth);

    const totalAmount = toNumber(quote.totalAmount);
    doc.font('NotoSans-Bold').fontSize(10);
    doc.text(`Tổng cộng: ${this.formatVnd(totalAmount)}`, left, y + 6, {
      width: pageWidth,
      align: 'right',
    });
    y = doc.y + 7;
    doc.font('NotoSans').fontSize(8.5).text(
      `Bằng chữ: ${this.capitalizeFirst(this.numberToVietnameseCurrency(totalAmount))}`,
      left,
      y,
      { width: pageWidth, height: 24 },
    );
    y = doc.y + 12;

    doc.font('NotoSans-Bold').text('Ghi chú / Điều khoản:', left, y);
    doc.font('NotoSans').fontSize(8.2);
    doc.text(`- Ghi chú: ${quote.notes || '-'}`, left, y + 14, { width: pageWidth, height: 24 });
    doc.text(
      `- Điều khoản thanh toán: ${
        quote.paymentTerms ||
        'Đơn giá chưa bao gồm thuế VAT nếu chưa có thỏa thuận khác.'
      }`,
      left,
      doc.y + 4,
      { width: pageWidth, height: 24 },
    );
    doc.text(`- Báo giá có hiệu lực đến: ${expiresText}.`, left, doc.y + 4, {
      width: pageWidth,
    });
    y = doc.y + 12;

    doc.font('NotoSans-Bold').fontSize(10).text('Mọi chi tiết vui lòng xin liên hệ:', left, y);
    doc.font('NotoSans').fontSize(8.2);
    doc.text(`Người phụ trách: ${ownerName}`, left, y + 14);
    doc.text(`Email: ${owner?.email || '-'}    Điện thoại: -`, left, doc.y + 3);
    y = doc.y + 22;

    const signatureWidth = (pageWidth - 40) / 2;
    doc.font('NotoSans-Bold').fontSize(9);
    doc.text('ĐẠI DIỆN KHÁCH HÀNG', left, y, { width: signatureWidth, align: 'center' });
    doc.text('ĐẠI DIỆN CÔNG TY', left + signatureWidth + 40, y, {
      width: signatureWidth,
      align: 'center',
    });
    doc.font('NotoSans').fontSize(8);
    doc.text('Ký và ghi rõ họ tên', left, y + 15, { width: signatureWidth, align: 'center' });
    doc.text('Ký và ghi rõ họ tên', left + signatureWidth + 40, y + 15, {
      width: signatureWidth,
      align: 'center',
    });

    doc.end();
    return done;
  }

  private async buildContractPdf(params: {
    contract: Contract;
    quote: Quote & { items: QuoteItem[] };
    opportunity: Opportunity;
    account: Account | null;
    contact: Contact | null;
    organization: Organization | null;
    owner: User | null;
  }): Promise<Buffer> {
    const { contract, quote, opportunity, account, contact, organization, owner } = params;
    const doc = new PDFDocument({
      size: 'A4',
      margin: 54,
      bufferPages: true,
      autoFirstPage: true,
    });
    this.registerVietnameseFonts(doc);

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const left = doc.page.margins.left;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const bottom = () => doc.page.height - doc.page.margins.bottom - 45;
    const safe = (value?: string | null) => value?.trim() || '-';
    const contactName = [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') || '-';
    const accountAddress =
      [
        account?.billingStreet,
        account?.billingCity,
        account?.billingState,
        account?.billingCountry,
      ]
        .filter(Boolean)
        .join(', ') || '-';
    const ownerName = [owner?.firstName, owner?.lastName].filter(Boolean).join(' ') || '-';
    const signDate = contract.startDate || contract.createdAt;
    const totalAmount = toNumber(contract.totalAmount);
    const defaultPaymentTerms =
      contract.paymentTerms ||
      quote.paymentTerms ||
      'Chuyển khoản hoặc theo thỏa thuận giữa hai bên trong quá trình thực hiện hợp đồng.';

    const ensureSpace = (height: number) => {
      if (doc.y + height > bottom()) {
        doc.addPage();
      }
    };
    const heading = (text: string) => {
      ensureSpace(34);
      doc.moveDown(0.55);
      doc.font('NotoSans-Bold').fontSize(11).text(text, left, doc.y, {
        width: pageWidth,
      });
      doc.moveDown(0.35);
      doc.font('NotoSans').fontSize(10);
    };
    const paragraph = (text: string) => {
      const height = doc.heightOfString(text, { width: pageWidth, align: 'justify', lineGap: 2 });
      ensureSpace(height + 8);
      doc.font('NotoSans').fontSize(10).text(text, {
        width: pageWidth,
        align: 'justify',
        lineGap: 2,
      });
      doc.moveDown(0.35);
    };
    const bullet = (text: string) => paragraph(`- ${text}`);
    const field = (label: string, value?: string | null) => {
      const content = `${label}: ${safe(value)}`;
      const height = doc.heightOfString(content, { width: pageWidth, lineGap: 1 });
      ensureSpace(height + 4);
      doc.font('NotoSans').fontSize(10).text(content, { width: pageWidth, lineGap: 1 });
      doc.moveDown(0.15);
    };

    doc.font('NotoSans-Bold').fontSize(12).text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', {
      width: pageWidth,
      align: 'center',
    });
    doc.font('NotoSans-Bold').fontSize(11).text('Độc lập - Tự do - Hạnh phúc', {
      width: pageWidth,
      align: 'center',
    });
    const underlineY = doc.y + 2;
    doc.moveTo(left + pageWidth / 2 - 58, underlineY).lineTo(left + pageWidth / 2 + 58, underlineY).stroke();
    doc.moveDown(1.5);

    doc.font('NotoSans-Bold').fontSize(14).text('HỢP ĐỒNG CUNG CẤP SẢN PHẨM/DỊCH VỤ', {
      width: pageWidth,
      align: 'center',
    });
    doc.moveDown(0.35);
    doc.font('NotoSans').fontSize(10).text(`Số: ${contract.contractNumber}`, {
      width: pageWidth,
      align: 'center',
    });
    doc.text(`Ngày lập: ${this.formatDateVi(signDate)}`, {
      width: pageWidth,
      align: 'center',
    });
    doc.moveDown(1);

    doc.font('NotoSans-Bold').fontSize(10).text('Căn cứ:', left, doc.y);
    doc.moveDown(0.3);
    bullet('Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015 và các văn bản pháp luật liên quan;');
    bullet('Luật Thương mại số 36/2005/QH11 ngày 14/06/2005 và các văn bản pháp luật liên quan;');
    bullet('Nhu cầu và khả năng của các bên;');
    bullet(`Báo giá số ${quote.quoteNumber} đã được chấp nhận;`);
    paragraph(
      `Hôm nay, ngày ${signDate.getDate()} tháng ${signDate.getMonth() + 1} năm ${signDate.getFullYear()}, các bên thống nhất ký kết hợp đồng với các nội dung sau.`,
    );

    heading('BÊN A: BÊN BÁN / BÊN CUNG CẤP');
    field('Tên doanh nghiệp', organization?.name || 'CRM Pro');
    field('Mã số doanh nghiệp', '-');
    field('Địa chỉ trụ sở chính', '-');
    field('Điện thoại', '-');
    field('Email', owner?.email || '-');
    field('Số tài khoản', '-');
    field('Mở tại ngân hàng', '-');
    field('Đại diện theo pháp luật', ownerName);
    field('Chức vụ', '-');

    heading('BÊN B: BÊN MUA / KHÁCH HÀNG');
    field('Tên doanh nghiệp / khách hàng', account?.name);
    field('Mã số doanh nghiệp', '-');
    field('Địa chỉ trụ sở chính', accountAddress);
    field('Điện thoại', account?.phone || contact?.phone || '-');
    field('Email', contact?.email || '-');
    field('Đại diện', contactName);
    field('Chức vụ', contact?.title || '-');

    paragraph('Trên cơ sở thỏa thuận, hai bên thống nhất ký kết hợp đồng với các điều khoản như sau:');

    heading('Điều 1: TÊN HÀNG - SỐ LƯỢNG - CHẤT LƯỢNG - GIÁ TRỊ HỢP ĐỒNG');
    this.drawContractItemsTable(doc, quote.items, left, pageWidth, ensureSpace);
    ensureSpace(52);
    doc.moveDown(0.45);
    doc.font('NotoSans-Bold').fontSize(10).text(`Tổng cộng: ${this.formatVnd(totalAmount)}`, left, doc.y, {
      width: pageWidth,
      align: 'right',
    });
    doc.moveDown(0.25);
    doc.font('NotoSans').fontSize(10).text(
      `Bằng chữ: ${this.capitalizeFirst(this.numberToVietnameseCurrency(totalAmount))}`,
      left,
      doc.y,
      { width: pageWidth, align: 'left', lineGap: 1 },
    );
    doc.moveDown(0.35);

    heading('Điều 2: THANH TOÁN');
    paragraph('Bên B thanh toán cho Bên A số tiền ghi tại Điều 1 của Hợp đồng này.');
    paragraph('Hình thức thanh toán: chuyển khoản hoặc theo thỏa thuận giữa hai bên.');
    paragraph(`Thời hạn thanh toán: ${defaultPaymentTerms}`);

    heading('Điều 3: THỜI GIAN, ĐỊA ĐIỂM VÀ PHƯƠNG THỨC BÀN GIAO');
    paragraph('Bên A bàn giao sản phẩm/dịch vụ cho Bên B theo thời gian hai bên thống nhất.');
    paragraph(`Địa điểm bàn giao: ${accountAddress !== '-' ? accountAddress : 'theo thông tin khách hàng hoặc theo thỏa thuận giữa hai bên'}.`);
    paragraph('Chi phí vận chuyển/lắp đặt nếu có sẽ do hai bên thỏa thuận.');
    paragraph('Khi nhận hàng hóa hoặc nghiệm thu dịch vụ, Bên B có trách nhiệm kiểm tra số lượng, chất lượng và xác nhận với Bên A.');

    heading('Điều 4: TRÁCH NHIỆM CỦA CÁC BÊN');
    paragraph('Bên A:');
    bullet('Cung cấp sản phẩm/dịch vụ đúng thông tin đã thống nhất.');
    bullet('Hỗ trợ Bên B trong quá trình bàn giao và sử dụng.');
    bullet('Chịu trách nhiệm xử lý các vấn đề phát sinh thuộc phạm vi cung cấp của mình.');
    paragraph('Bên B:');
    bullet('Thanh toán đúng thời hạn đã thỏa thuận.');
    bullet('Cung cấp đầy đủ thông tin cần thiết để Bên A thực hiện hợp đồng.');
    bullet('Phối hợp nghiệm thu, tiếp nhận sản phẩm/dịch vụ.');

    heading('Điều 5: BẢO HÀNH VÀ HỖ TRỢ SỬ DỤNG');
    paragraph('Bên A thực hiện bảo hành hoặc hỗ trợ theo chính sách áp dụng cho từng sản phẩm/dịch vụ.');
    paragraph('Trường hợp cần hướng dẫn sử dụng, Bên A có trách nhiệm hỗ trợ Bên B trong phạm vi đã thỏa thuận.');

    heading('Điều 6: PHẠT VI PHẠM HỢP ĐỒNG');
    paragraph('Hai bên cam kết thực hiện nghiêm túc các điều khoản đã thỏa thuận.');
    paragraph('Trường hợp một bên vi phạm nghĩa vụ, hai bên sẽ ưu tiên thương lượng để xử lý.');
    paragraph('Mức phạt hoặc bồi thường nếu có sẽ thực hiện theo thỏa thuận và quy định pháp luật liên quan.');

    heading('Điều 7: BẤT KHẢ KHÁNG VÀ GIẢI QUYẾT TRANH CHẤP');
    paragraph('Bất khả kháng là các sự kiện xảy ra khách quan, không thể lường trước và không thể khắc phục dù đã áp dụng các biện pháp cần thiết.');
    paragraph('Khi xảy ra bất khả kháng, bên gặp sự kiện phải thông báo cho bên còn lại trong thời gian hợp lý.');
    paragraph('Mọi tranh chấp phát sinh sẽ được ưu tiên giải quyết bằng thương lượng. Nếu không đạt được thỏa thuận, tranh chấp sẽ được giải quyết theo quy định pháp luật hiện hành.');

    heading('Điều 8: ĐIỀU KHOẢN CHUNG');
    paragraph('Hợp đồng có hiệu lực kể từ ngày ký.');
    paragraph('Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.');
    paragraph('Mọi sửa đổi, bổ sung hợp đồng phải được hai bên thống nhất bằng văn bản.');
    paragraph('Hai bên cam kết thực hiện đúng các điều khoản đã ghi trong hợp đồng.');
    if (contract.terms) {
      paragraph(`Điều khoản bổ sung: ${contract.terms}`);
    }

    this.drawContractSignatureTable(doc, left, pageWidth, ensureSpace);
    this.addPdfPageNumbers(doc);

    doc.end();
    return done;
  }

  private registerVietnameseFonts(doc: PDFKit.PDFDocument) {
    const regularPath = join(process.cwd(), 'assets', 'fonts', 'NotoSans-Regular.ttf');
    const boldPath = join(process.cwd(), 'assets', 'fonts', 'NotoSans-Bold.ttf');
    if (!existsSync(regularPath) || !existsSync(boldPath)) {
      throw new Error('Không tìm thấy font Unicode để xuất PDF báo giá.');
    }
    doc.registerFont('NotoSans', regularPath);
    doc.registerFont('NotoSans-Bold', boldPath);
    doc.font('NotoSans');
  }

  private drawQuoteItemsTable(
    doc: PDFKit.PDFDocument,
    items: Array<{
      productName: string;
      unit?: string | null;
      quantity: Prisma.Decimal | number | string;
      unitPrice: Prisma.Decimal | number | string;
      discountAmount: Prisma.Decimal | number | string;
      lineTotal: Prisma.Decimal | number | string;
    }>,
    x: number,
    y: number,
    width: number,
  ) {
    const columns = [
      { key: 'index', label: 'STT', width: 30, align: 'center' as const },
      { key: 'name', label: 'Nội dung sản phẩm / dịch vụ', width: 158, align: 'left' as const },
      { key: 'unit', label: 'ĐVT', width: 42, align: 'center' as const },
      { key: 'quantity', label: 'SL', width: 42, align: 'right' as const },
      { key: 'unitPrice', label: 'Đơn giá (VNĐ)', width: 86, align: 'right' as const },
      { key: 'discount', label: 'Giảm giá', width: 76, align: 'right' as const },
      { key: 'lineTotal', label: 'Thành tiền', width: width - 434, align: 'right' as const },
    ];
    const headerHeight = 26;
    const drawHeader = () => {
      doc.rect(x, y, width, headerHeight).fillAndStroke('#eef2f7', '#9ca3af');
      doc.fillColor('#000000').font('NotoSans-Bold').fontSize(7.6);
      let currentX = x;
      columns.forEach((column) => {
        doc.rect(currentX, y, column.width, headerHeight).stroke('#9ca3af');
        doc.text(column.label, currentX + 4, y + 6, {
          width: column.width - 8,
          align: column.align,
        });
        currentX += column.width;
      });
      y += headerHeight;
    };

    drawHeader();
    doc.font('NotoSans').fontSize(7.6);
    items.forEach((item, index) => {
      const nameHeight = doc.heightOfString(item.productName || '-', {
        width: columns[1].width - 8,
      });
      const rowHeight = Math.max(19, nameHeight + 8);

      const values: Record<string, string> = {
        index: String(index + 1),
        name: item.productName || '-',
        unit: item.unit || '-',
        quantity: this.formatQuantity(toNumber(item.quantity)),
        unitPrice: this.formatNumber(toNumber(item.unitPrice)),
        discount: this.formatNumber(toNumber(item.discountAmount)),
        lineTotal: this.formatNumber(toNumber(item.lineTotal)),
      };
      let currentX = x;
      columns.forEach((column) => {
        doc.rect(currentX, y, column.width, rowHeight).stroke('#d1d5db');
        doc.text(values[column.key], currentX + 4, y + 6, {
          width: column.width - 8,
          align: column.align,
        });
        currentX += column.width;
      });
      y += rowHeight;
    });
    return y;
  }

  private drawContractItemsTable(
    doc: PDFKit.PDFDocument,
    items: QuoteItem[],
    x: number,
    width: number,
    ensureSpace: (height: number) => void,
  ) {
    const columns = [
      { key: 'index', label: 'STT', width: 30, align: 'center' as const },
      { key: 'name', label: 'Tên hàng hóa / dịch vụ', width: 132, align: 'left' as const },
      { key: 'unit', label: 'Đơn vị', width: 44, align: 'center' as const },
      { key: 'quantity', label: 'Số lượng', width: 48, align: 'center' as const },
      { key: 'unitPrice', label: 'Đơn giá', width: 72, align: 'right' as const },
      { key: 'lineTotal', label: 'Thành tiền', width: 82, align: 'right' as const },
      { key: 'note', label: 'Ghi chú', width: width - 408, align: 'left' as const },
    ];
    const headerHeight = 28;
    const bottom = () => doc.page.height - doc.page.margins.bottom - 45;

    const drawHeader = () => {
      ensureSpace(headerHeight + 20);
      let y = doc.y;
      doc.rect(x, y, width, headerHeight).fillAndStroke('#f3f4f6', '#111827');
      doc.fillColor('#000000').font('NotoSans-Bold').fontSize(8);
      let currentX = x;
      columns.forEach((column) => {
        doc.rect(currentX, y, column.width, headerHeight).stroke('#111827');
        doc.text(column.label, currentX + 3, y + 7, {
          width: column.width - 6,
          align: column.align,
        });
        currentX += column.width;
      });
      doc.y = y + headerHeight;
    };

    drawHeader();
    doc.font('NotoSans').fontSize(8);
    items.forEach((item, index) => {
      const values: Record<string, string> = {
        index: String(index + 1),
        name: item.productName || '-',
        unit: item.unit || '-',
        quantity: this.formatQuantity(toNumber(item.quantity)),
        unitPrice: this.formatNumber(toNumber(item.unitPrice)),
        lineTotal: this.formatNumber(toNumber(item.lineTotal)),
        note: item.discountAmount && toNumber(item.discountAmount) > 0
          ? `Giảm ${this.formatNumber(toNumber(item.discountAmount))}`
          : '',
      };
      const nameHeight = doc.heightOfString(values.name, { width: columns[1].width - 6 });
      const noteHeight = doc.heightOfString(values.note || '-', { width: columns[6].width - 6 });
      const rowHeight = Math.max(24, nameHeight + 10, noteHeight + 10);
      if (doc.y + rowHeight > bottom()) {
        doc.addPage();
        drawHeader();
      }

      const y = doc.y;
      let currentX = x;
      doc.font('NotoSans').fontSize(8);
      columns.forEach((column) => {
        doc.rect(currentX, y, column.width, rowHeight).stroke('#111827');
        doc.text(values[column.key] || '-', currentX + 3, y + 6, {
          width: column.width - 6,
          align: column.align,
        });
        currentX += column.width;
      });
      doc.y = y + rowHeight;
    });
  }

  private drawContractSignatureTable(
    doc: PDFKit.PDFDocument,
    x: number,
    width: number,
    ensureSpace: (height: number) => void,
  ) {
    const height = 96;
    ensureSpace(height + 16);
    doc.moveDown(0.8);
    const y = doc.y;
    const columnWidth = width / 2;
    doc.rect(x, y, width, height).stroke('#9ca3af');
    doc.moveTo(x + columnWidth, y).lineTo(x + columnWidth, y + height).stroke('#9ca3af');
    doc.moveTo(x, y + 28).lineTo(x + width, y + 28).stroke('#d1d5db');

    doc.font('NotoSans-Bold').fontSize(10);
    doc.text('ĐẠI DIỆN BÊN A', x, y + 8, { width: columnWidth, align: 'center' });
    doc.text('ĐẠI DIỆN BÊN B', x + columnWidth, y + 8, {
      width: columnWidth,
      align: 'center',
    });
    doc.font('NotoSans').fontSize(9);
    doc.text('Chức vụ', x, y + 38, { width: columnWidth, align: 'center' });
    doc.text('Chức vụ', x + columnWidth, y + 38, { width: columnWidth, align: 'center' });
    doc.text('(Ký tên, đóng dấu)', x, y + 62, { width: columnWidth, align: 'center' });
    doc.text('(Ký tên, đóng dấu)', x + columnWidth, y + 62, {
      width: columnWidth,
      align: 'center',
    });
    doc.y = y + height;
  }

  private addPdfPageNumbers(doc: PDFKit.PDFDocument) {
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      doc.font('NotoSans').fontSize(8).fillColor('#6b7280');
      const footerY = doc.page.height - doc.page.margins.bottom - 35;
      doc.text(`Trang ${i + 1}/${range.count}`, doc.page.margins.left, footerY, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        align: 'center',
        lineBreak: false,
      });
      doc.fillColor('#000000');
    }
  }


  private formatDateVi(value?: Date | null) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(value);
  }

  private formatNumber(value: number) {
    return Math.round(value).toLocaleString('vi-VN');
  }

  private formatVnd(value: number) {
    return `${this.formatNumber(value)} VNĐ`;
  }

  private formatQuantity(value: number) {
    return Number.isInteger(value) ? String(value) : value.toLocaleString('vi-VN');
  }

  private capitalizeFirst(value: string) {
    return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
  }

  private numberToVietnameseCurrency(value: number) {
    const rounded = Math.round(value);
    if (rounded === 0) return 'không đồng';
    return `${this.numberToVietnameseWords(rounded)} đồng`;
  }

  private numberToVietnameseWords(value: number): string {
    const units = ['', 'nghìn', 'triệu', 'tỷ'];
    const groups: number[] = [];
    let remaining = Math.floor(Math.abs(value));
    while (remaining > 0) {
      groups.push(remaining % 1000);
      remaining = Math.floor(remaining / 1000);
    }

    const words = groups
      .map((group, index) => ({ group, index }))
      .filter(({ group }) => group > 0)
      .reverse()
      .map(({ group, index }, position) => {
        const prefix = this.readThreeDigits(group, position > 0);
        return `${prefix}${units[index] ? ` ${units[index]}` : ''}`.trim();
      })
      .join(' ');

    return words.trim();
  }

  private readThreeDigits(value: number, full: boolean) {
    const digitWords = [
      'không',
      'một',
      'hai',
      'ba',
      'bốn',
      'năm',
      'sáu',
      'bảy',
      'tám',
      'chín',
    ];
    const hundred = Math.floor(value / 100);
    const ten = Math.floor((value % 100) / 10);
    const unit = value % 10;
    const parts: string[] = [];

    if (hundred > 0 || full) {
      parts.push(`${digitWords[hundred]} trăm`);
    }
    if (ten > 1) {
      parts.push(`${digitWords[ten]} mươi`);
      if (unit === 1) parts.push('mốt');
      else if (unit === 5) parts.push('lăm');
      else if (unit > 0) parts.push(digitWords[unit]);
    } else if (ten === 1) {
      parts.push('mười');
      if (unit === 5) parts.push('lăm');
      else if (unit > 0) parts.push(digitWords[unit]);
    } else if (unit > 0) {
      if (hundred > 0 || full) parts.push('lẻ');
      parts.push(unit === 5 && (hundred > 0 || full) ? 'năm' : digitWords[unit]);
    }

    return parts.join(' ');
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
