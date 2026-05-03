import { httpClient } from '@/lib/api/http-client';
import { Note } from './notes.types';

export const notesApi = {
  getAll: async (params?: { relatedType?: string; relatedId?: string }) => {
    const { data } = await httpClient.get<Note[]>('/notes', { params });
    return data;
  },
  create: async (payload: Partial<Note>) => {
    const { data } = await httpClient.post<Note>('/notes', payload);
    return data;
  },
  delete: async (id: string) => {
    await httpClient.delete(`/notes/${id}`);
  }
};
