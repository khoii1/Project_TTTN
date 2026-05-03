import { httpClient } from "@/lib/api/http-client";
import { toPaginatedArray } from "@/lib/api/pagination";
import { Lead } from "./leads.types";

export const leadsApi = {
  getAll: async (params?: Record<string, string | number | undefined>) => {
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
  convert: async (id: string) => {
    const { data } = await httpClient.post(`/leads/${id}/convert`);
    return data;
  },
  delete: async (id: string) => {
    await httpClient.delete(`/leads/${id}`);
  },
};
