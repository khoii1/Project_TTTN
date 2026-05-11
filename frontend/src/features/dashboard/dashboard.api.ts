import { httpClient } from "@/lib/api/http-client";
import {
  CasesByPriorityItem,
  DashboardSummary,
  DashboardTask,
  LeadsByStatusItem,
  OpportunitiesByStageItem,
} from "./dashboard.types";

export const dashboardApi = {
  getSummary: async () => {
    const { data } =
      await httpClient.get<DashboardSummary>("/dashboard/summary");
    return data;
  },
  getLeadsByStatus: async () => {
    const { data } = await httpClient.get<LeadsByStatusItem[]>(
      "/dashboard/leads-by-status",
    );
    return data;
  },
  getOpportunitiesByStage: async () => {
    const { data } = await httpClient.get<OpportunitiesByStageItem[]>(
      "/dashboard/opportunities-by-stage",
    );
    return data;
  },
  getCasesByPriority: async () => {
    const { data } = await httpClient.get<CasesByPriorityItem[]>(
      "/dashboard/cases-by-priority",
    );
    return data;
  },
  getUpcomingTasks: async (limit = 5) => {
    const { data } = await httpClient.get<DashboardTask[]>(
      "/dashboard/upcoming-tasks",
      { params: { limit } },
    );
    return data;
  },
};
