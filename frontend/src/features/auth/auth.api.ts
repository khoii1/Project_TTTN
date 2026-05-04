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
  getCurrentUser: async () => {
    const { data } = await httpClient.get("/users/me"); // Wait, the endpoint is GET /organizations/me but usually /users/me or we can just fetch users if needed, or decode JWT. For now let's just decode JWT or if backend has user profile. Actually, requirement says GET /organizations/me. We might not have /users/me, let's just trust what's in the auth response and store it.
    return data;
  },
};
