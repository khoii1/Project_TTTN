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
