import { httpClient } from "@/lib/api/http-client";
import { toPaginatedArray } from "@/lib/api/pagination";
import { Task, TaskComment, TaskStatus } from "./tasks.types";

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
  getComments: async (id: string) => {
    const { data } = await httpClient.get<TaskComment[]>(`/tasks/${id}/comments`);
    return data;
  },
  createComment: async (
    id: string,
    payload: { content?: string; files?: File[] },
  ) => {
    const formData = new FormData();
    if (payload.content) {
      formData.append("content", payload.content);
    }
    for (const file of payload.files || []) {
      formData.append("files", file);
    }

    const { data } = await httpClient.post<TaskComment>(
      `/tasks/${id}/comments`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },
  updateComment: async (taskId: string, commentId: string, content: string) => {
    const { data } = await httpClient.patch<TaskComment>(
      `/tasks/${taskId}/comments/${commentId}`,
      { content },
    );
    return data;
  },
  deleteComment: async (taskId: string, commentId: string) => {
    const { data } = await httpClient.delete<TaskComment>(
      `/tasks/${taskId}/comments/${commentId}`,
    );
    return data;
  },
};
