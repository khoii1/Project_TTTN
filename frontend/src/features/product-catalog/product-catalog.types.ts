export enum ProductType {
  PRODUCT = "PRODUCT",
  SERVICE = "SERVICE",
  PACKAGE = "PACKAGE",
}

export interface ProductCatalogItem {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  type: ProductType;
  unit?: string;
  defaultPrice: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProductPayload = {
  name: string;
  code: string;
  type: ProductType;
  unit?: string;
  defaultPrice?: number;
  description?: string;
  isActive?: boolean;
};

export interface ProductPackageItem {
  id?: string;
  productId: string;
  productName?: string;
  productCode?: string;
  quantity: number;
  unitPrice?: number;
  note?: string;
}

export interface ProductPackage {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  itemCount: number;
  estimatedTotal: number;
  createdAt: string;
  updatedAt: string;
  items: ProductPackageItem[];
}

export type ProductPackagePayload = {
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
  items: ProductPackageItem[];
};
