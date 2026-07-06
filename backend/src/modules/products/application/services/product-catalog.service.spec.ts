import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Prisma, UserRole } from '@prisma/client';
import { RoleGuard } from '../../../../shared/guards/role.guard';
import { ProductPackagesController } from '../../presentation/product-packages.controller';
import { ProductsController } from '../../presentation/products.controller';
import { ProductCatalogService } from './product-catalog.service';

describe('ProductCatalogService hard delete', () => {
  const product = { id: 'product-1', organizationId: 'org-1' };
  const productPackage = { id: 'package-1', organizationId: 'org-1' };

  const setup = () => {
    const tx = {
      product: {
        findFirst: jest.fn().mockResolvedValue(product),
        delete: jest.fn().mockResolvedValue(product),
      },
      productPackageItem: {
        count: jest.fn().mockResolvedValue(0),
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      opportunityProduct: {
        count: jest.fn().mockResolvedValue(0),
      },
      quoteItem: {
        count: jest.fn().mockResolvedValue(0),
      },
      productPackage: {
        findFirst: jest.fn().mockResolvedValue(productPackage),
        delete: jest.fn().mockResolvedValue(productPackage),
      },
    };
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (callback) => callback(tx)),
    };
    const service = new ProductCatalogService(prisma as any);
    return { service, prisma, tx };
  };

  afterEach(() => jest.clearAllMocks());

  it('deletes an unused product without touching other products or sales data', async () => {
    const { service, prisma, tx } = setup();

    await expect(service.deleteProduct(product.id, 'org-1')).resolves.toEqual({
      message: 'Đã xóa sản phẩm vĩnh viễn.',
    });
    expect(tx.product.delete).toHaveBeenCalledWith({ where: { id: product.id } });
    expect(tx.product.delete).toHaveBeenCalledTimes(1);
    expect(tx.productPackageItem.deleteMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  });

  it('returns not found for a product outside the organization', async () => {
    const { service, tx } = setup();
    tx.product.findFirst.mockResolvedValue(null);

    await expect(service.deleteProduct(product.id, 'org-2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(tx.product.findFirst).toHaveBeenCalledWith({
      where: { id: product.id, organizationId: 'org-2' },
      select: { id: true },
    });
    expect(tx.product.delete).not.toHaveBeenCalled();
  });

  it.each([
    ['productPackageItem', 'gói sản phẩm'],
    ['opportunityProduct', 'cơ hội bán hàng'],
    ['quoteItem', 'báo giá'],
  ])('blocks a product referenced by %s', async (relation, messagePart) => {
    const { service, tx } = setup();
    (tx as any)[relation].count.mockResolvedValue(1);

    await expect(service.deleteProduct(product.id, 'org-1')).rejects.toThrow(
      messagePart,
    );
    expect(tx.product.delete).not.toHaveBeenCalled();
  });

  it('converts a product foreign-key race into a Vietnamese business error', async () => {
    const { service, tx } = setup();
    tx.product.delete.mockRejectedValue({ code: 'P2003', message: 'raw database error' });

    await expect(service.deleteProduct(product.id, 'org-1')).rejects.toThrow(
      'Không thể xóa sản phẩm vì sản phẩm đang được sử dụng trong dữ liệu bán hàng.',
    );
  });

  it('deletes package items and package atomically without deleting products', async () => {
    const { service, prisma, tx } = setup();

    await expect(service.deletePackage(productPackage.id, 'org-1')).resolves.toEqual({
      message: 'Đã xóa gói sản phẩm vĩnh viễn.',
    });
    expect(tx.productPackageItem.deleteMany).toHaveBeenCalledWith({
      where: { packageId: productPackage.id },
    });
    expect(tx.productPackage.delete).toHaveBeenCalledWith({
      where: { id: productPackage.id },
    });
    expect(tx.product.delete).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  });

  it('returns not found for a package outside the organization', async () => {
    const { service, tx } = setup();
    tx.productPackage.findFirst.mockResolvedValue(null);

    await expect(
      service.deletePackage(productPackage.id, 'org-2'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.productPackageItem.deleteMany).not.toHaveBeenCalled();
    expect(tx.productPackage.delete).not.toHaveBeenCalled();
  });

  it('keeps package deletion inside one transaction when its final step fails', async () => {
    const { service, prisma, tx } = setup();
    tx.productPackage.delete.mockRejectedValue(new Error('delete failed'));

    await expect(service.deletePackage(productPackage.id, 'org-1')).rejects.toThrow(
      'delete failed',
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.productPackageItem.deleteMany).toHaveBeenCalledTimes(1);
    expect(tx.productPackage.delete).toHaveBeenCalledTimes(1);
  });

  it('converts a package foreign-key race into a Vietnamese business error', async () => {
    const { service, tx } = setup();
    tx.productPackage.delete.mockRejectedValue({
      code: 'P2003',
      message: 'raw database error',
    });

    await expect(service.deletePackage(productPackage.id, 'org-1')).rejects.toThrow(
      'Không thể xóa gói sản phẩm vì gói đang được sử dụng trong dữ liệu nghiệp vụ.',
    );
  });
});

describe('Product delete RBAC', () => {
  const guard = new RoleGuard(new Reflector());

  const contextFor = (handler: (...args: any[]) => any, role: UserRole) =>
    ({
      getHandler: () => handler,
      switchToHttp: () => ({
        getRequest: () => ({ user: { role } }),
      }),
    }) as any;

  it.each([
    [ProductsController.prototype.remove, UserRole.ADMIN],
    [ProductsController.prototype.remove, UserRole.MANAGER],
    [ProductPackagesController.prototype.remove, UserRole.ADMIN],
    [ProductPackagesController.prototype.remove, UserRole.MANAGER],
  ])('allows authorized role on delete handler', (handler, role) => {
    expect(guard.canActivate(contextFor(handler, role))).toBe(true);
  });

  it.each([
    [ProductsController.prototype.remove, UserRole.SALES],
    [ProductsController.prototype.remove, UserRole.SUPPORT],
    [ProductPackagesController.prototype.remove, UserRole.SALES],
    [ProductPackagesController.prototype.remove, UserRole.SUPPORT],
  ])('blocks unauthorized role on delete handler', (handler, role) => {
    expect(() => guard.canActivate(contextFor(handler, role))).toThrow(
      ForbiddenException,
    );
  });
});
