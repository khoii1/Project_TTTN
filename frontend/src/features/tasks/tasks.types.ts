export enum TaskStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum TaskPriority {
  LOW = "LOW",
  NORMAL = "NORMAL",
  HIGH = "HIGH",
}

export interface Task {
  id: string;
  subject: string; // Changed from 'title' to match backend
  description?: string;
  dueDate?: string;
  status: TaskStatus;
  priority: TaskPriority;
  relatedType?: string; // LEAD, ACCOUNT, CONTACT, OPPORTUNITY, CASE
  relatedId?: string;
  organizationId: string;
  ownerId: string;
  assignedToId: string;
  completedAt?: string;
  completedById?: string;
  deletedAt?: string;
  deletedById?: string;
  restoredAt?: string;
  restoredById?: string;
  createdAt: string;
  updatedAt: string;
}
