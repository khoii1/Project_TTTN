import { httpClient } from "@/lib/api/http-client";
import { AuthResponse } from "./auth.types";

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  organizationName: string;
};

export const authApi = {
  login: async (credentials: LoginPayload): Promise<AuthResponse> => {
    const { data } = await httpClient.post("/auth/login", credentials);
    return data;
  },
  register: async (userData: RegisterPayload): Promise<AuthResponse> => {
    const { data } = await httpClient.post("/auth/register", userData);
    return data;
  },
  logout: async () => {
    await httpClient.post("/auth/logout");
  },
};
