import { httpClient } from '@/lib/api/http-client';
import { User } from '../auth/auth.types';

export const usersApi = {
  getAll: async (params?: any) => {
    const { data } = await httpClient.get('/users', { params });
    return data;
  },
  getById: async (id: string) => {
    const { data } = await httpClient.get<User>(`/users/${id}`);
    return data;
  },
  create: async (payload: Partial<User>) => {
    const { data } = await httpClient.post<User>('/users', payload);
    return data;
  },
  update: async (id: string, payload: Partial<User>) => {
    const { data } = await httpClient.patch<User>(`/users/${id}`, payload);
    return data;
  },
  delete: async (id: string) => {
    await httpClient.delete(`/users/${id}`);
  }
};
