import { httpClient } from "@/lib/api/http-client";
import { toPaginatedArray } from "@/lib/api/pagination";
import { Opportunity } from "./opportunities.types";

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
};
