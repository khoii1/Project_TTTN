import { httpClient } from "@/lib/api/http-client";
import {
  LeadAssignmentRule,
  LeadAssignmentRulePayload,
} from "./lead-assignment.types";

export const leadAssignmentApi = {
  getAll: async () => {
    const { data } = await httpClient.get<LeadAssignmentRule[]>(
      "/lead-assignment-rules",
    );
    return data;
  },
  create: async (payload: LeadAssignmentRulePayload) => {
    const { data } = await httpClient.post<LeadAssignmentRule>(
      "/lead-assignment-rules",
      payload,
    );
    return data;
  },
  update: async (id: string, payload: Partial<LeadAssignmentRulePayload>) => {
    const { data } = await httpClient.patch<LeadAssignmentRule>(
      `/lead-assignment-rules/${id}`,
      payload,
    );
    return data;
  },
  deactivate: async (id: string) => {
    const { data } = await httpClient.delete<LeadAssignmentRule>(
      `/lead-assignment-rules/${id}`,
    );
    return data;
  },
};
