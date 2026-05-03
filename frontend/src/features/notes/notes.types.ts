export interface Note {
  id: string;
  content: string;
  relatedType: string; // LEAD, ACCOUNT, CONTACT, OPPORTUNITY, CASE
  relatedId: string;
  organizationId: string;
  authorId: string;
  author?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}
