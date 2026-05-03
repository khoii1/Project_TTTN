export enum OpportunityStage {
  QUALIFY = "QUALIFY",
  PROPOSE = "PROPOSE",
  NEGOTIATE = "NEGOTIATE",
  CLOSED_WON = "CLOSED_WON",
  CLOSED_LOST = "CLOSED_LOST",
}

export interface Opportunity {
  id: string;
  name: string;
  amount?: number;
  stage: OpportunityStage;
  closeDate?: string;
  nextStep?: string;
  description?: string;
  accountId: string;
  contactId?: string;
  organizationId: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
