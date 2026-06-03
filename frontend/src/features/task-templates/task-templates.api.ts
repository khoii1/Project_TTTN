import { httpClient } from "@/lib/api/http-client";
import { TaskTemplate, TaskTemplatePayload } from "./task-templates.types";

export const taskTemplatesApi = {
  getAll: async () => {
    const { data } = await httpClient.get<TaskTemplate[]>("/task-templates");
    return data;
  },
  getActive: async () => {
    const { data } = await httpClient.get<TaskTemplate[]>("/task-templates/active");
    return data;
  },
  getById: async (id: string) => {
    const { data } = await httpClient.get<TaskTemplate>(`/task-templates/${id}`);
    return data;
  },
  create: async (payload: TaskTemplatePayload) => {
    const { data } = await httpClient.post<TaskTemplate>("/task-templates", payload);
    return data;
  },
  update: async (id: string, payload: TaskTemplatePayload) => {
    const { data } = await httpClient.patch<TaskTemplate>(
      `/task-templates/${id}`,
      payload,
    );
    return data;
  },
  setDefault: async (id: string) => {
    const { data } = await httpClient.patch<TaskTemplate>(
      `/task-templates/${id}/set-default`,
    );
    return data;
  },
  deactivate: async (id: string) => {
    const { data } = await httpClient.delete<TaskTemplate>(`/task-templates/${id}`);
    return data;
  },
  deleteInactive: async (id: string) => {
    const { data } = await httpClient.delete<{ message: string }>(
      `/task-templates/${id}/hard`,
    );
    return data;
  },
};
