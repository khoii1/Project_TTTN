import { httpClient } from "@/lib/api/http-client";
import { toPaginatedArray } from "@/lib/api/pagination";
import {
  Contract,
  Opportunity,
  OpportunityAttachment,
  OpportunityProduct,
  ProductCatalogItem,
  ProductPackage,
  Quote,
  QuoteStatus,
} from "./opportunities.types";

export const opportunitiesApi = {
  getAll: async (
    params?: Record<string, string | number | boolean | undefined>,
  ) => {
    const { data } = await httpClient.get("/opportunities", { params });
    return toPaginatedArray<Opportunity>(data);
  },
  getById: async (id: string) => {
    const { data } = await httpClient.get<Opportunity>(`/opportunities/${id}`);
    return data;
  },
  create: async (payload: Partial<Opportunity>) => {
    const { data } = await httpClient.post<Opportunity>(
      "/opportunities",
      payload,
    );
    return data;
  },
  update: async (id: string, payload: Partial<Opportunity>) => {
    const { data } = await httpClient.patch<Opportunity>(
      `/opportunities/${id}`,
      payload,
    );
    return data;
  },
  updateStage: async (id: string, stage: string) => {
    const { data } = await httpClient.patch<Opportunity>(
      `/opportunities/${id}/stage`,
      { stage },
    );
    return data;
  },
  delete: async (id: string) => {
    await httpClient.delete(`/opportunities/${id}`);
  },
  restore: async (id: string) => {
    const { data } = await httpClient.patch<Opportunity>(
      `/opportunities/${id}/restore`,
    );
    return data;
  },
  getAttachments: async (id: string) => {
    const { data } = await httpClient.get<OpportunityAttachment[]>(
      `/opportunities/${id}/attachments`,
    );
    return data;
  },
  uploadAttachments: async (id: string, files: File[]) => {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }

    const { data } = await httpClient.post<OpportunityAttachment[]>(
      `/opportunities/${id}/attachments`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },
  deleteAttachment: async (id: string, attachmentId: string) => {
    await httpClient.delete(`/opportunities/${id}/attachments/${attachmentId}`);
  },
  getAttachmentSignedUrl: async (id: string, attachmentId: string) => {
    const { data } = await httpClient.get<{ signedUrl: string }>(
      `/opportunities/${id}/attachments/${attachmentId}/download`,
    );
    return data.signedUrl;
  },
  getProductsCatalog: async () => {
    const { data } = await httpClient.get<ProductCatalogItem[]>(
      "/opportunities/catalog/products",
    );
    return data;
  },
  getProductPackages: async () => {
    const { data } = await httpClient.get<ProductPackage[]>(
      "/opportunities/catalog/packages",
    );
    return data;
  },
  getOpportunityProducts: async (id: string) => {
    const { data } = await httpClient.get<OpportunityProduct[]>(
      `/opportunities/${id}/products`,
    );
    return data;
  },
  addOpportunityProduct: async (
    id: string,
    payload: {
      productId: string;
      quantity: number;
      unitPrice?: number;
      discountAmount?: number;
    },
  ) => {
    const { data } = await httpClient.post<OpportunityProduct>(
      `/opportunities/${id}/products`,
      payload,
    );
    return data;
  },
  addOpportunityPackage: async (id: string, packageId: string) => {
    const { data } = await httpClient.post<OpportunityProduct[]>(
      `/opportunities/${id}/product-packages`,
      { packageId },
    );
    return data;
  },
  removeOpportunityProduct: async (id: string, rowId: string) => {
    await httpClient.delete(`/opportunities/${id}/products/${rowId}`);
  },
  getQuotes: async (id: string) => {
    const { data } = await httpClient.get<Quote[]>(`/opportunities/${id}/quotes`);
    return data;
  },
  createQuote: async (
    id: string,
    payload: { expiresAt?: string; notes?: string; paymentTerms?: string },
  ) => {
    const { data } = await httpClient.post<Quote>(
      `/opportunities/${id}/quotes`,
      payload,
    );
    return data;
  },
  updateQuoteStatus: async (id: string, quoteId: string, status: QuoteStatus) => {
    const { data } = await httpClient.patch<Quote>(
      `/opportunities/${id}/quotes/${quoteId}/status`,
      { status },
    );
    return data;
  },
  generateQuotePdf: async (id: string, quoteId: string) => {
    const { data } = await httpClient.post<Quote>(
      `/opportunities/${id}/quotes/${quoteId}/pdf`,
    );
    return data;
  },
  getQuotePdfUrl: async (id: string, quoteId: string) => {
    const { data } = await httpClient.get<{ signedUrl: string }>(
      `/opportunities/${id}/quotes/${quoteId}/pdf`,
    );
    return data.signedUrl;
  },
  getContracts: async (id: string) => {
    const { data } = await httpClient.get<Contract[]>(
      `/opportunities/${id}/contracts`,
    );
    return data;
  },
  createContract: async (
    id: string,
    payload: {
      quoteId: string;
      name?: string;
      startDate?: string;
      endDate?: string;
      paymentTerms?: string;
      terms?: string;
    },
  ) => {
    const { data } = await httpClient.post<Contract>(
      `/opportunities/${id}/contracts`,
      payload,
    );
    return data;
  },
  generateContractPdf: async (id: string, contractId: string) => {
    const { data } = await httpClient.post<Contract>(
      `/opportunities/${id}/contracts/${contractId}/pdf`,
    );
    return data;
  },
  getContractPdfUrl: async (id: string, contractId: string) => {
    const { data } = await httpClient.get<{ signedUrl: string }>(
      `/opportunities/${id}/contracts/${contractId}/pdf`,
    );
    return data.signedUrl;
  },
};
