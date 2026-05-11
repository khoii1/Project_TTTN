export interface Account {
  id: string;
  name: string;
  website?: string;
  type?: string;
  phone?: string;
  source?: string;
  sourceDetail?: string;
  description?: string;
  organizationId: string;
  ownerId: string;
  billingCountry?: string;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  shippingCountry?: string;
  shippingStreet?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPostalCode?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  deletedById?: string;
  restoredAt?: string;
  restoredById?: string;
}
