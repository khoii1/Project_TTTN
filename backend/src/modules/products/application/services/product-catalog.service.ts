import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Product, ProductPackage } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  CreateProductDto,
  CreateProductPackageDto,
  ProductPackageResponseDto,
  ProductResponseDto,
  UpdateProductDto,
  UpdateProductPackageDto,
} from '../dto/product-catalog.dto';

const toNumber = (value: Prisma.Decimal | number | string | null | undefined) =>
  value === null || value === undefined ? 0 : Number(value.toString());

const money = (value: number | undefined) =>
  new Prisma.Decimal(Number(value || 0).toFixed(2));

type PackageWithItems = Prisma.ProductPackageGetPayload<{
  include: { items: { include: { product: true } } };
}>;

@Injectable()
export class ProductCatalogService {
  constructor(private prisma: PrismaService) {}

  async findProducts(organizationId: string): Promise<ProductResponseDto[]> {
    const products = await this.prisma.product.findMany({
      where: { organizationId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    return products.map((product) => this.mapProduct(product));
  }

  async findProductById(id: string, organizationId: string): Promise<ProductResponseDto> {
    return this.mapProduct(await this.findProductOrThrow(id, organizationId));
  }

  async createProduct(
    organizationId: string,
    dto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    await this.assertUniqueProductCode(organizationId, dto.code);

    const product = await this.prisma.product.create({
      data: {
        id: randomUUID(),
        organizationId,
        name: dto.name.trim(),
        code: dto.code.trim(),
        type: dto.type,
        unit: dto.unit?.trim(),
        defaultPrice: money(dto.defaultPrice),
        description: dto.description?.trim(),
        isActive: dto.isActive ?? true,
      },
    });

    return this.mapProduct(product);
  }

  async updateProduct(
    id: string,
    organizationId: string,
    dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const existing = await this.findProductOrThrow(id, organizationId);
    if (dto.code && dto.code.trim() !== existing.code) {
      await this.assertUniqueProductCode(organizationId, dto.code, id);
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        code: dto.code?.trim(),
        type: dto.type,
        unit: dto.unit?.trim(),
        defaultPrice:
          dto.defaultPrice === undefined ? undefined : money(dto.defaultPrice),
        description: dto.description?.trim(),
        isActive: dto.isActive,
      },
    });

    return this.mapProduct(product);
  }

  async deactivateProduct(
    id: string,
    organizationId: string,
  ): Promise<ProductResponseDto> {
    await this.findProductOrThrow(id, organizationId);
    const product = await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return this.mapProduct(product);
  }

  async deleteProduct(
    id: string,
    organizationId: string,
  ): Promise<{ message: string }> {
    try {
      await this.prisma.$transaction(
        async (tx) => {
          const product = await tx.product.findFirst({
            where: { id, organizationId },
            select: { id: true },
          });

          if (!product) {
            throw new NotFoundException('Không tìm thấy sản phẩm.');
          }

          const [packageItemCount, opportunityProductCount, quoteItemCount] =
            await Promise.all([
              tx.productPackageItem.count({ where: { productId: id } }),
              tx.opportunityProduct.count({ where: { productId: id } }),
              tx.quoteItem.count({ where: { productId: id } }),
            ]);

          if (packageItemCount > 0) {
            throw new BadRequestException(
              'Không thể xóa sản phẩm vì sản phẩm đang được sử dụng trong gói sản phẩm. Bạn có thể tắt sản phẩm thay vì xóa.',
            );
          }
          if (opportunityProductCount > 0) {
            throw new BadRequestException(
              'Không thể xóa sản phẩm vì sản phẩm đang được sử dụng trong cơ hội bán hàng. Bạn có thể tắt sản phẩm thay vì xóa.',
            );
          }
          if (quoteItemCount > 0) {
            throw new BadRequestException(
              'Không thể xóa sản phẩm vì sản phẩm đã xuất hiện trong báo giá. Bạn có thể tắt sản phẩm thay vì xóa.',
            );
          }

          await tx.product.delete({ where: { id } });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (['P2003', 'P2034'].includes((error as { code?: string })?.code || '')) {
        throw new BadRequestException(
          'Không thể xóa sản phẩm vì sản phẩm đang được sử dụng trong dữ liệu bán hàng. Bạn có thể tắt sản phẩm thay vì xóa.',
        );
      }
      throw error;
    }

    return { message: 'Đã xóa sản phẩm vĩnh viễn.' };
  }

  async findPackages(organizationId: string): Promise<ProductPackageResponseDto[]> {
    const packages = await this.prisma.productPackage.findMany({
      where: { organizationId },
      include: {
        items: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    return packages.map((item) => this.mapPackage(item));
  }

  async findPackageById(
    id: string,
    organizationId: string,
  ): Promise<ProductPackageResponseDto> {
    return this.mapPackage(await this.findPackageOrThrow(id, organizationId));
  }

  async createPackage(
    organizationId: string,
    dto: CreateProductPackageDto,
  ): Promise<ProductPackageResponseDto> {
    await this.assertUniquePackageCode(organizationId, dto.code);
    await this.assertPackageItems(organizationId, dto);

    const productPackage = await this.prisma.productPackage.create({
      data: {
        id: randomUUID(),
        organizationId,
        name: dto.name.trim(),
        code: dto.code.trim(),
        description: dto.description?.trim(),
        isActive: dto.isActive ?? true,
        items: { create: this.buildPackageItems(dto) },
      },
      include: {
        items: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    return this.mapPackage(productPackage);
  }

  async updatePackage(
    id: string,
    organizationId: string,
    dto: UpdateProductPackageDto,
  ): Promise<ProductPackageResponseDto> {
    const existing = await this.findPackageOrThrow(id, organizationId);
    if (dto.code && dto.code.trim() !== existing.code) {
      await this.assertUniquePackageCode(organizationId, dto.code, id);
    }
    if (dto.items !== undefined) {
      await this.assertPackageItems(organizationId, dto);
    }

    const productPackage = await this.prisma.$transaction(async (tx) => {
      if (dto.items !== undefined) {
        await tx.productPackageItem.deleteMany({ where: { packageId: id } });
      }
      return tx.productPackage.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          code: dto.code?.trim(),
          description: dto.description?.trim(),
          isActive: dto.isActive,
          items:
            dto.items === undefined
              ? undefined
              : { create: this.buildPackageItems(dto) },
        },
        include: {
          items: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
        },
      });
    });

    return this.mapPackage(productPackage);
  }

  async deactivatePackage(
    id: string,
    organizationId: string,
  ): Promise<ProductPackageResponseDto> {
    await this.findPackageOrThrow(id, organizationId);
    const productPackage = await this.prisma.productPackage.update({
      where: { id },
      data: { isActive: false },
      include: {
        items: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    return this.mapPackage(productPackage);
  }

  async deletePackage(
    id: string,
    organizationId: string,
  ): Promise<{ message: string }> {
    try {
      await this.prisma.$transaction(
        async (tx) => {
          const productPackage = await tx.productPackage.findFirst({
            where: { id, organizationId },
            select: { id: true },
          });

          if (!productPackage) {
            throw new NotFoundException('Không tìm thấy gói sản phẩm.');
          }

          await tx.productPackageItem.deleteMany({ where: { packageId: id } });
          await tx.productPackage.delete({ where: { id } });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (['P2003', 'P2034'].includes((error as { code?: string })?.code || '')) {
        throw new BadRequestException(
          'Không thể xóa gói sản phẩm vì gói đang được sử dụng trong dữ liệu nghiệp vụ. Bạn có thể tắt gói sản phẩm thay vì xóa.',
        );
      }
      throw error;
    }

    return { message: 'Đã xóa gói sản phẩm vĩnh viễn.' };
  }

  private async findProductOrThrow(id: string, organizationId: string): Promise<Product> {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm.');
    }

    return product;
  }

  private async findPackageOrThrow(
    id: string,
    organizationId: string,
  ): Promise<PackageWithItems> {
    const productPackage = await this.prisma.productPackage.findFirst({
      where: { id, organizationId },
      include: {
        items: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!productPackage) {
      throw new NotFoundException('Không tìm thấy gói sản phẩm.');
    }

    return productPackage;
  }

  private async assertUniqueProductCode(
    organizationId: string,
    code: string,
    excludeId?: string,
  ) {
    const existing = await this.prisma.product.findFirst({
      where: {
        organizationId,
        code: code.trim(),
        id: excludeId ? { not: excludeId } : undefined,
      },
    });

    if (existing) {
      throw new ConflictException('Mã sản phẩm đã tồn tại trong tổ chức.');
    }
  }

  private async assertUniquePackageCode(
    organizationId: string,
    code: string,
    excludeId?: string,
  ) {
    const existing = await this.prisma.productPackage.findFirst({
      where: {
        organizationId,
        code: code.trim(),
        id: excludeId ? { not: excludeId } : undefined,
      },
    });

    if (existing) {
      throw new ConflictException('Mã gói sản phẩm đã tồn tại trong tổ chức.');
    }
  }

  private async assertPackageItems(
    organizationId: string,
    dto: CreateProductPackageDto | UpdateProductPackageDto,
  ) {
    if (!dto.items?.length) {
      throw new BadRequestException('Gói sản phẩm cần có ít nhất một sản phẩm.');
    }

    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { organizationId, id: { in: productIds } },
      select: { id: true },
    });
    const validIds = new Set(products.map((product) => product.id));

    for (const item of dto.items) {
      if (!validIds.has(item.productId)) {
        throw new BadRequestException('Gói có sản phẩm không thuộc tổ chức hiện tại.');
      }
      if (item.quantity <= 0) {
        throw new BadRequestException('Số lượng sản phẩm trong gói phải lớn hơn 0.');
      }
    }
  }

  private buildPackageItems(dto: CreateProductPackageDto | UpdateProductPackageDto) {
    return (dto.items || []).map((item, index) => ({
      id: randomUUID(),
      productId: item.productId,
      quantity: item.quantity,
      unitPrice:
        item.unitPrice === undefined ? undefined : money(item.unitPrice),
      note: item.note?.trim(),
      sortOrder: index + 1,
    }));
  }

  private mapProduct(product: Product): ProductResponseDto {
    return {
      id: product.id,
      organizationId: product.organizationId,
      name: product.name,
      code: product.code,
      type: product.type,
      unit: product.unit || undefined,
      defaultPrice: toNumber(product.defaultPrice),
      description: product.description || undefined,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private mapPackage(productPackage: PackageWithItems): ProductPackageResponseDto {
    const items = productPackage.items.map((item) => {
      const unitPrice = item.unitPrice
        ? toNumber(item.unitPrice)
        : toNumber(item.product.defaultPrice);
      return {
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productCode: item.product.code,
        quantity: toNumber(item.quantity),
        unitPrice,
        note: item.note || undefined,
      };
    });

    return {
      id: productPackage.id,
      organizationId: productPackage.organizationId,
      name: productPackage.name,
      code: productPackage.code,
      description: productPackage.description || undefined,
      isActive: productPackage.isActive,
      itemCount: items.length,
      estimatedTotal: items.reduce(
        (sum, item) => sum + item.quantity * (item.unitPrice || 0),
        0,
      ),
      createdAt: productPackage.createdAt,
      updatedAt: productPackage.updatedAt,
      items,
    };
  }
}
