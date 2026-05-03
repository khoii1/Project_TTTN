export interface Contact {
  id: string;
  firstName?: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  description?: string;
  accountId: string;
  organizationId: string;
  ownerId: string;
  mailingCountry?: string;
  mailingStreet?: string;
  mailingCity?: string;
  mailingState?: string;
  mailingPostalCode?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
