export const UserRole = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  SALES: 'SALES',
  SUPPORT: 'SUPPORT',
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRoleType;
  organizationId: string;
  organization?: Organization;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}
