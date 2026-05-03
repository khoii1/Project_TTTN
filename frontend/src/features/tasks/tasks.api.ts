import { httpClient } from '@/lib/api/http-client';
import { Task } from './tasks.types';

export const tasksApi = {
  getAll: async (params?: any) => {
    const { data } = await httpClient.get('/tasks', { params });
    return data;
  },
  getById: async (id: string) => {
    const { data } = await httpClient.get<Task>(`/tasks/${id}`);
    return data;
  },
  create: async (payload: Partial<Task>) => {
    const { data } = await httpClient.post<Task>('/tasks', payload);
    return data;
  },
  update: async (id: string, payload: Partial<Task>) => {
    const { data } = await httpClient.patch<Task>(`/tasks/${id}`, payload);
    return data;
  },
  complete: async (id: string) => {
    const { data } = await httpClient.patch<Task>(`/tasks/${id}/complete`);
    return data;
  },
  delete: async (id: string) => {
    await httpClient.delete(`/tasks/${id}`);
  }
};
