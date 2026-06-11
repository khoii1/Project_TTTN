import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ContractStatus, ProductType, QuoteStatus } from '@prisma/client';

export class AddOpportunityProductDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;
}

export class AddOpportunityPackageDto {
  @ApiProperty()
  @IsString()
  packageId: string;
}

export class CreateQuoteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentTerms?: string;
}

export class UpdateQuoteStatusDto {
  @ApiProperty({ enum: QuoteStatus })
  @IsEnum(QuoteStatus)
  status: QuoteStatus;
}

export class CreateContractDto {
  @ApiProperty()
  @IsString()
  quoteId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  terms?: string;
}

export class ProductResponseDto {
  id: string;
  name: string;
  code: string;
  type: ProductType;
  unit?: string;
  defaultPrice: number;
  description?: string;
  isActive: boolean;
}

export class ProductPackageResponseDto {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productCode: string;
    quantity: number;
    unitPrice?: number;
  }>;
}

export class OpportunityProductResponseDto {
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
  createdAt: Date;
}

export class QuoteResponseDto {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  totalAmount: number;
  expiresAt?: Date;
  notes?: string;
  paymentTerms?: string;
  pdfGeneratedAt?: Date;
  pdfSignedUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productCode: string;
    unit?: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    lineTotal: number;
  }>;
}

export class ContractResponseDto {
  id: string;
  contractNumber: string;
  name: string;
  status: ContractStatus;
  quoteId: string;
  totalAmount: number;
  startDate: Date;
  endDate?: Date;
  paymentTerms?: string;
  terms?: string;
  pdfGeneratedAt?: Date;
  pdfSignedUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
