export interface Note {
  id: string;
  content: string;
  relatedType: string; // LEAD, ACCOUNT, CONTACT, OPPORTUNITY, CASE
  relatedId: string;
  organizationId: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
