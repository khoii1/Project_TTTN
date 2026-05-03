import { httpClient } from '@/lib/api/http-client';
import { Organization } from '../auth/auth.types';

export const organizationsApi = {
  getMe: async () => {
    const { data } = await httpClient.get<Organization>('/organizations/me');
    return data;
  }
};
