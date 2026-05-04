import { httpClient } from "@/lib/api/http-client";
import { toPaginatedArray } from "@/lib/api/pagination";
import { Contact } from "./contacts.types";

export const contactsApi = {
  getAll: async (
    params?: Record<string, string | number | boolean | undefined>,
  ) => {
    const { data } = await httpClient.get("/contacts", { params });
    return toPaginatedArray<Contact>(data);
  },
  getById: async (id: string) => {
    const { data } = await httpClient.get<Contact>(`/contacts/${id}`);
    return data;
  },
  create: async (payload: Partial<Contact>) => {
    const { data } = await httpClient.post<Contact>("/contacts", payload);
    return data;
  },
  update: async (id: string, payload: Partial<Contact>) => {
    const { data } = await httpClient.patch<Contact>(
      `/contacts/${id}`,
      payload,
    );
    return data;
  },
  delete: async (id: string) => {
    await httpClient.delete(`/contacts/${id}`);
  },
  restore: async (id: string) => {
    const { data } = await httpClient.patch<Contact>(`/contacts/${id}/restore`);
    return data;
  },
};
