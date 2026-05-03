export enum LeadStatus {
  NEW = "NEW",
  CONTACTED = "CONTACTED",
  NURTURING = "NURTURING",
  QUALIFIED = "QUALIFIED",
  UNQUALIFIED = "UNQUALIFIED",
  CONVERTED = "CONVERTED",
}

export interface Lead {
  id: string;
  firstName?: string;
  lastName: string;
  company: string;
  email?: string;
  phone?: string;
  status: LeadStatus;
  organizationId: string;
  ownerId: string;
  title?: string;
  website?: string;
  source?: string;
  industry?: string;
  description?: string;
  convertedAccountId?: string;
  convertedContactId?: string;
  convertedOpportunityId?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
