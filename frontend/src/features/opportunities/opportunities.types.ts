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
  source?: string;
  sourceDetail?: string;
  description?: string;
  stageChangedAt?: string;
  stageChangedById?: string;
  accountId: string;
  contactId?: string;
  organizationId: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  deletedById?: string;
  restoredAt?: string;
  restoredById?: string;
}

export interface OpportunityAttachment {
  id: string;
  opportunityId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  isImage: boolean;
  signedUrl?: string;
  uploadedById: string;
  uploadedByName: string;
  uploadedByEmail: string;
  createdAt: string;
}

export enum ProductType {
  PRODUCT = "PRODUCT",
  SERVICE = "SERVICE",
  PACKAGE = "PACKAGE",
}

export enum QuoteStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
}

export enum ContractStatus {
  DRAFT = "DRAFT",
  PDF_GENERATED = "PDF_GENERATED",
  SENT = "SENT",
  SIGNED = "SIGNED",
  ACTIVE = "ACTIVE",
  CANCELLED = "CANCELLED",
}

export interface ProductCatalogItem {
  id: string;
  name: string;
  code: string;
  type: ProductType;
  unit?: string;
  defaultPrice: number;
  description?: string;
  isActive: boolean;
}

export interface ProductPackageItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice?: number;
}

export interface ProductPackage {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  items: ProductPackageItem[];
}

export interface OpportunityProduct {
  id: string;
  opportunityId: string;
  productId: string;
  productName: string;
  productCode: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
  createdAt: string;
}

export interface QuoteItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  totalAmount: number;
  expiresAt?: string;
  notes?: string;
  paymentTerms?: string;
  pdfGeneratedAt?: string;
  pdfSignedUrl?: string;
  canceledAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  items: QuoteItem[];
}

export interface Contract {
  id: string;
  contractNumber: string;
  name: string;
  status: ContractStatus;
  quoteId: string;
  totalAmount: number;
  startDate: string;
  endDate?: string;
  paymentTerms?: string;
  terms?: string;
  pdfGeneratedAt?: string;
  pdfSignedUrl?: string;
  canceledAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}
