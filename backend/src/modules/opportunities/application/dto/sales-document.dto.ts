import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
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
  @ApiProperty({ example: 'Báo giá gói nhượng quyền tiêu chuẩn', maxLength: 200 })
  @IsDefined({ message: 'Tên báo giá là bắt buộc.' })
  @IsString({ message: 'Tên báo giá phải là chuỗi.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Tên báo giá không được để trống.' })
  @MaxLength(200, { message: 'Tên báo giá không được vượt quá 200 ký tự.' })
  name: string;

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

export class UpdateQuoteDto {
  @ApiProperty({ example: 'Báo giá lần 2 sau điều chỉnh', maxLength: 200 })
  @IsDefined({ message: 'Tên báo giá là bắt buộc.' })
  @IsString({ message: 'Tên báo giá phải là chuỗi.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Tên báo giá không được để trống.' })
  @MaxLength(200, { message: 'Tên báo giá không được vượt quá 200 ký tự.' })
  name: string;
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
  name: string;
  quoteNumber: string;
  status: QuoteStatus;
  totalAmount: number;
  expiresAt?: Date;
  notes?: string;
  paymentTerms?: string;
  pdfGeneratedAt?: Date;
  pdfSignedUrl?: string;
  canceledAt?: Date;
  deletedAt?: Date;
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
  canceledAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
