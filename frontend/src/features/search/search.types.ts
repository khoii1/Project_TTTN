import { Account } from "@/features/accounts/accounts.types";
import { Case } from "@/features/cases/cases.types";
import { Contact } from "@/features/contacts/contacts.types";
import { Lead } from "@/features/leads/leads.types";
import { Opportunity } from "@/features/opportunities/opportunities.types";
import { Task } from "@/features/tasks/tasks.types";

export type GlobalSearchResults = {
  leads: Lead[];
  accounts: Account[];
  contacts: Contact[];
  opportunities: Opportunity[];
  cases: Case[];
  tasks: Task[];
};
