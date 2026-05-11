import { TaskPriority, TaskStatus } from "@/features/tasks/tasks.types";

export type DashboardSummary = {
  totalLeads: number;
  totalAccounts: number;
  totalContacts: number;
  totalOpportunities: number;
  openOpportunitiesValue: number;
  closedWonValue: number;
  openTasks: number;
  overdueTasks: number;
  openCases: number;
};

export type LeadsByStatusItem = {
  status: string;
  count: number;
};

export type OpportunitiesByStageItem = {
  stage: string;
  count: number;
  amount: number;
};

export type CasesByPriorityItem = {
  priority: string;
  count: number;
};

export type DashboardTask = {
  id: string;
  subject: string;
  dueDate?: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
};
