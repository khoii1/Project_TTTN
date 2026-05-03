import { httpClient } from '@/lib/api/http-client';
import { Contact } from './contacts.types';

export const contactsApi = {
  getAll: async (params?: any) => {
    const { data } = await httpClient.get('/contacts', { params });
    return data;
  },
  getById: async (id: string) => {
    const { data } = await httpClient.get<Contact>(`/contacts/${id}`);
    return data;
  },
  create: async (payload: Partial<Contact>) => {
    const { data } = await httpClient.post<Contact>('/contacts', payload);
    return data;
  },
  update: async (id: string, payload: Partial<Contact>) => {
    const { data } = await httpClient.patch<Contact>(`/contacts/${id}`, payload);
    return data;
  },
  delete: async (id: string) => {
    await httpClient.delete(`/contacts/${id}`);
  }
};
