export type TaskTemplatePriority = "LOW" | "NORMAL" | "HIGH";

export interface TaskTemplateItem {
  id?: string;
  title: string;
  description?: string;
  priority: TaskTemplatePriority;
  dueAfterDays: number;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskTemplateGroup {
  id?: string;
  name: string;
  description?: string;
  sortOrder: number;
  items: TaskTemplateItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskTemplate {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  groups: TaskTemplateGroup[];
  groupCount: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export type TaskTemplatePayload = {
  name: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  groups?: TaskTemplateGroup[];
};
