import { httpClient } from '@/lib/api/http-client';
import { Case } from './cases.types';

export const casesApi = {
  getAll: async (params?: any) => {
    const { data } = await httpClient.get('/cases', { params });
    return data;
  },
  getById: async (id: string) => {
    const { data } = await httpClient.get<Case>(`/cases/${id}`);
    return data;
  },
  create: async (payload: Partial<Case>) => {
    const { data } = await httpClient.post<Case>('/cases', payload);
    return data;
  },
  update: async (id: string, payload: Partial<Case>) => {
    const { data } = await httpClient.patch<Case>(`/cases/${id}`, payload);
    return data;
  },
  updateStatus: async (id: string, status: string) => {
    const { data } = await httpClient.patch<Case>(`/cases/${id}/status`, { status });
    return data;
  },
  delete: async (id: string) => {
    await httpClient.delete(`/cases/${id}`);
  }
};
