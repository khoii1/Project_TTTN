import { accountsApi } from "@/features/accounts/accounts.api";
import { Account } from "@/features/accounts/accounts.types";
import { casesApi } from "@/features/cases/cases.api";
import { Case } from "@/features/cases/cases.types";
import { contactsApi } from "@/features/contacts/contacts.api";
import { Contact } from "@/features/contacts/contacts.types";
import { leadsApi } from "@/features/leads/leads.api";
import { Lead } from "@/features/leads/leads.types";
import { opportunitiesApi } from "@/features/opportunities/opportunities.api";
import { Opportunity } from "@/features/opportunities/opportunities.types";
import { tasksApi } from "@/features/tasks/tasks.api";
import { Task } from "@/features/tasks/tasks.types";
import { getDataArray } from "@/lib/api/pagination";
import { GlobalSearchResults } from "./search.types";

const searchParams = (query: string) => ({
  search: query,
  page: 1,
  limit: 5,
});

const safeSearch = async <T,>(request: Promise<unknown>): Promise<T[]> => {
  try {
    return getDataArray<T>(await request);
  } catch (error) {
    console.warn("Global search request failed", error);
    return [];
  }
};

export const globalSearch = async (
  query: string,
): Promise<GlobalSearchResults> => {
  const params = searchParams(query);

  const [leads, accounts, contacts, opportunities, cases, tasks] =
    await Promise.all([
      safeSearch<Lead>(leadsApi.getAll(params)),
      safeSearch<Account>(accountsApi.getAll(params)),
      safeSearch<Contact>(contactsApi.getAll(params)),
      safeSearch<Opportunity>(opportunitiesApi.getAll(params)),
      safeSearch<Case>(casesApi.getAll(params)),
      safeSearch<Task>(tasksApi.getAll(params)),
    ]);

  return {
    leads,
    accounts,
    contacts,
    opportunities,
    cases,
    tasks,
  };
};
