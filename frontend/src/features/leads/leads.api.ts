import { httpClient } from "@/lib/api/http-client";
import { toPaginatedArray } from "@/lib/api/pagination";
import {
  ConvertLeadPayload,
  Lead,
  LeadConversionSuggestions,
} from "./leads.types";

export const leadsApi = {
  getAll: async (
    params?: Record<string, string | number | boolean | undefined>,
  ) => {
    const { data } = await httpClient.get("/leads", { params });
    return toPaginatedArray<Lead>(data);
  },
  getById: async (id: string) => {
    const { data } = await httpClient.get<Lead>(`/leads/${id}`);
    return data;
  },
  create: async (payload: Partial<Lead>) => {
    const { data } = await httpClient.post<Lead>("/leads", payload);
    return data;
  },
  update: async (id: string, payload: Partial<Lead>) => {
    const { data } = await httpClient.patch<Lead>(`/leads/${id}`, payload);
    return data;
  },
  updateStatus: async (id: string, status: string) => {
    const { data } = await httpClient.patch<Lead>(`/leads/${id}/status`, {
      status,
    });
    return data;
  },
  convert: async (id: string, payload?: ConvertLeadPayload) => {
    const { data } = await httpClient.post(`/leads/${id}/convert`, payload);
    return data;
  },
  getConversionSuggestions: async (id: string) => {
    const { data } = await httpClient.get<LeadConversionSuggestions>(
      `/leads/${id}/conversion-suggestions`,
    );
    return data;
  },
  delete: async (id: string) => {
    await httpClient.delete(`/leads/${id}`);
  },
  restore: async (id: string) => {
    const { data } = await httpClient.patch<Lead>(`/leads/${id}/restore`);
    return data;
  },
};
