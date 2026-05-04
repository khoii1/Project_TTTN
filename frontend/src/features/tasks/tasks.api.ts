import { httpClient } from "@/lib/api/http-client";
import { toPaginatedArray } from "@/lib/api/pagination";
import { Task, TaskStatus } from "./tasks.types";

export const tasksApi = {
  getAll: async (
    params?: Record<string, string | number | boolean | undefined>,
  ) => {
    const { data } = await httpClient.get("/tasks", { params });
    return toPaginatedArray<Task>(data);
  },
  getById: async (id: string) => {
    const { data } = await httpClient.get<Task>(`/tasks/${id}`);
    return data;
  },
  create: async (payload: Partial<Task>) => {
    const { data } = await httpClient.post<Task>("/tasks", payload);
    return data;
  },
  update: async (id: string, payload: Partial<Task>) => {
    const { data } = await httpClient.patch<Task>(`/tasks/${id}`, payload);
    return data;
  },
  updateStatus: async (id: string, status: TaskStatus) => {
    const { data } = await httpClient.patch<Task>(`/tasks/${id}/complete`, {
      status,
    });
    return data;
  },
  complete: async (id: string) => {
    const { data } = await httpClient.patch<Task>(`/tasks/${id}/complete`, {
      status: TaskStatus.COMPLETED,
    });
    return data;
  },
  delete: async (id: string) => {
    await httpClient.delete(`/tasks/${id}`);
  },
  restore: async (id: string) => {
    const { data } = await httpClient.patch<Task>(`/tasks/${id}/restore`);
    return data;
  },
};
