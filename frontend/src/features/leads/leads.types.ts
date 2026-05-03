export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  NURTURING = 'NURTURING',
  QUALIFIED = 'QUALIFIED',
  UNQUALIFIED = 'UNQUALIFIED',
  CONVERTED = 'CONVERTED',
}

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  status: LeadStatus;
  organizationId: string;
  assignedToId?: string;
  createdAt: string;
  updatedAt: string;
}
