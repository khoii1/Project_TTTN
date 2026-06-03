export interface LeadAssignmentRule {
  id: string;
  provinceName: string;
  wardName: string;
  assigneeId: string;
  assigneeName?: string;
  assigneeEmail?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type LeadAssignmentRulePayload = {
  provinceName: string;
  wardName: string;
  assigneeId: string;
  isActive?: boolean;
};
