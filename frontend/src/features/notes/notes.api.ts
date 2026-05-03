import { httpClient } from "@/lib/api/http-client";
import { toPaginatedArray } from "@/lib/api/pagination";
import { Note } from "./notes.types";

export const notesApi = {
  getAll: async (params?: { relatedType?: string; relatedId?: string }) => {
    const { data } = await httpClient.get("/notes", { params });
    return toPaginatedArray<Note>(data);
  },
  create: async (payload: Partial<Note>) => {
    const { data } = await httpClient.post<Note>("/notes", payload);
    return data;
  },
  delete: async (id: string) => {
    await httpClient.delete(`/notes/${id}`);
  },
};
