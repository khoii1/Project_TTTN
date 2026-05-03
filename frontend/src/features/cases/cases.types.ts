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
  accountId?: string;
  contactId?: string;
  organizationId: string;
  assignedToId?: string;
  createdAt: string;
  updatedAt: string;
}
