export enum CaseStatus {
  NEW = 'NEW',
  WORKING = 'WORKING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum CasePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface Case {
  id: string;
  subject: string;
  description?: string;
  status: CaseStatus;
  priority: CasePriority;
  source?: string;
  sourceDetail?: string;
  accountId?: string;
  contactId?: string;
  organizationId: string;
  ownerId?: string;
  assignedToId?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}
