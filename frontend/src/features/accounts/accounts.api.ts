import { httpClient } from '@/lib/api/http-client';
import { Account } from './accounts.types';

export const accountsApi = {
  getAll: async (params?: any) => {
    const { data } = await httpClient.get('/accounts', { params });
    return data;
  },
  getById: async (id: string) => {
    const { data } = await httpClient.get<Account>(`/accounts/${id}`);
    return data;
  },
  create: async (payload: Partial<Account>) => {
    const { data } = await httpClient.post<Account>('/accounts', payload);
    return data;
  },
  update: async (id: string, payload: Partial<Account>) => {
    const { data } = await httpClient.patch<Account>(`/accounts/${id}`, payload);
    return data;
  },
  delete: async (id: string) => {
    await httpClient.delete(`/accounts/${id}`);
  }
};
