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
  sourceDetail?: string;
  industry?: string;
  description?: string;
  convertedAccountId?: string;
  convertedContactId?: string;
  convertedOpportunityId?: string;
  convertedAt?: string;
  convertedById?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  deletedById?: string;
  restoredAt?: string;
  restoredById?: string;
}

export type LeadConvertMode = "CREATE_NEW" | "USE_EXISTING";
export type LeadConvertOpportunityMode =
  | "CREATE_NEW"
  | "USE_EXISTING"
  | "DO_NOT_CREATE";

export interface ConvertLeadPayload {
  accountMode?: LeadConvertMode;
  accountId?: string;
  contactMode?: LeadConvertMode;
  contactId?: string;
  opportunityMode?: LeadConvertOpportunityMode;
  opportunityId?: string;
  opportunityName?: string;
}

export interface LeadConversionAccountSuggestion {
  id: string;
  name: string;
  website?: string;
  phone?: string;
  ownerId: string;
}

export interface LeadConversionContactSuggestion {
  id: string;
  firstName?: string;
  lastName: string;
  email?: string;
  phone?: string;
  accountId: string;
}

export interface LeadConversionOpportunitySuggestion {
  id: string;
  name: string;
  stage: string;
  accountId: string;
  amount?: number;
}

export interface LeadConversionSuggestions {
  accounts: LeadConversionAccountSuggestion[];
  contacts: LeadConversionContactSuggestion[];
  opportunities: LeadConversionOpportunitySuggestion[];
}
