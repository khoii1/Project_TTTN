import { httpClient } from "@/lib/api/http-client";
import {
  ProductCatalogItem,
  ProductPackage,
  ProductPackagePayload,
  ProductPayload,
} from "./product-catalog.types";

export const productCatalogApi = {
  getProducts: async () => {
    const { data } = await httpClient.get<ProductCatalogItem[]>("/products");
    return data;
  },
  getProductById: async (id: string) => {
    const { data } = await httpClient.get<ProductCatalogItem>(`/products/${id}`);
    return data;
  },
  createProduct: async (payload: ProductPayload) => {
    const { data } = await httpClient.post<ProductCatalogItem>(
      "/products",
      payload,
    );
    return data;
  },
  updateProduct: async (id: string, payload: ProductPayload) => {
    const { data } = await httpClient.patch<ProductCatalogItem>(
      `/products/${id}`,
      payload,
    );
    return data;
  },
  deactivateProduct: async (id: string) => {
    const { data } = await httpClient.delete<ProductCatalogItem>(
      `/products/${id}`,
    );
    return data;
  },
  getPackages: async () => {
    const { data } = await httpClient.get<ProductPackage[]>("/product-packages");
    return data;
  },
  getPackageById: async (id: string) => {
    const { data } = await httpClient.get<ProductPackage>(
      `/product-packages/${id}`,
    );
    return data;
  },
  createPackage: async (payload: ProductPackagePayload) => {
    const { data } = await httpClient.post<ProductPackage>(
      "/product-packages",
      payload,
    );
    return data;
  },
  updatePackage: async (id: string, payload: ProductPackagePayload) => {
    const { data } = await httpClient.patch<ProductPackage>(
      `/product-packages/${id}`,
      payload,
    );
    return data;
  },
  deactivatePackage: async (id: string) => {
    const { data } = await httpClient.delete<ProductPackage>(
      `/product-packages/${id}`,
    );
    return data;
  },
};
