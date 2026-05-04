import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiProperty({ example: 'Global Solutions Inc' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'https://globalsolutions.com' })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ example: 'Enterprise' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  type?: string;

  @ApiPropertyOptional({ example: '+1-555-0201' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'WEBSITE' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ example: 'Website form landing page A' })
  @IsString()
  @IsOptional()
  sourceDetail?: string;

  @ApiPropertyOptional({ example: 'Key enterprise customer' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'USA' })
  @IsString()
  @IsOptional()
  billingCountry?: string;

  @ApiPropertyOptional({ example: '1 Market St' })
  @IsString()
  @IsOptional()
  billingStreet?: string;

  @ApiPropertyOptional({ example: 'New York' })
  @IsString()
  @IsOptional()
  billingCity?: string;

  @ApiPropertyOptional({ example: 'NY' })
  @IsString()
  @IsOptional()
  billingState?: string;

  @ApiPropertyOptional({ example: '10001' })
  @IsString()
  @IsOptional()
  billingPostalCode?: string;

  @ApiPropertyOptional({ example: 'USA' })
  @IsString()
  @IsOptional()
  shippingCountry?: string;

  @ApiPropertyOptional({ example: '1 Market St' })
  @IsString()
  @IsOptional()
  shippingStreet?: string;

  @ApiPropertyOptional({ example: 'New York' })
  @IsString()
  @IsOptional()
  shippingCity?: string;

  @ApiPropertyOptional({ example: 'NY' })
  @IsString()
  @IsOptional()
  shippingState?: string;

  @ApiPropertyOptional({ example: '10001' })
  @IsString()
  @IsOptional()
  shippingPostalCode?: string;
}

export class UpdateAccountDto {
  @ApiPropertyOptional({ example: 'Global Solutions Inc' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  type?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsString()
  @IsOptional()
  sourceDetail?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  billingCountry?: string;

  @IsString()
  @IsOptional()
  billingStreet?: string;

  @IsString()
  @IsOptional()
  billingCity?: string;

  @IsString()
  @IsOptional()
  billingState?: string;

  @IsString()
  @IsOptional()
  billingPostalCode?: string;

  @IsString()
  @IsOptional()
  shippingCountry?: string;

  @IsString()
  @IsOptional()
  shippingStreet?: string;

  @IsString()
  @IsOptional()
  shippingCity?: string;

  @IsString()
  @IsOptional()
  shippingState?: string;

  @IsString()
  @IsOptional()
  shippingPostalCode?: string;
}

export class AccountResponseDto {
  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  id: string;
  @ApiProperty({ example: 'Global Solutions Inc' })
  name: string;
  @ApiPropertyOptional({ example: 'https://globalsolutions.com' })
  website?: string;
  @ApiPropertyOptional({ example: 'Enterprise' })
  type?: string;
  @ApiPropertyOptional({ example: '+1-555-0201' })
  phone?: string;
  @ApiPropertyOptional({ example: 'WEBSITE' })
  source?: string;
  @ApiPropertyOptional({ example: 'Website form landing page A' })
  sourceDetail?: string;
  @ApiPropertyOptional({ example: 'Key enterprise customer' })
  description?: string;
  @ApiPropertyOptional({ example: 'USA' })
  billingCountry?: string;
  @ApiPropertyOptional({ example: '1 Market St' })
  billingStreet?: string;
  @ApiPropertyOptional({ example: 'New York' })
  billingCity?: string;
  @ApiPropertyOptional({ example: 'NY' })
  billingState?: string;
  @ApiPropertyOptional({ example: '10001' })
  billingPostalCode?: string;
  @ApiPropertyOptional({ example: 'USA' })
  shippingCountry?: string;
  @ApiPropertyOptional({ example: '1 Market St' })
  shippingStreet?: string;
  @ApiPropertyOptional({ example: 'New York' })
  shippingCity?: string;
  @ApiPropertyOptional({ example: 'NY' })
  shippingState?: string;
  @ApiPropertyOptional({ example: '10001' })
  shippingPostalCode?: string;
  @ApiProperty({ example: '44444444-4444-4444-4444-444444444444' })
  ownerId: string;
  @ApiProperty({ example: '55555555-5555-5555-5555-555555555555' })
  organizationId: string;
  @ApiPropertyOptional({ example: '2026-04-29T08:00:00.000Z' })
  deletedAt?: Date;
  @ApiProperty({ example: '2026-04-29T08:00:00.000Z' })
  createdAt: Date;
  @ApiProperty({ example: '2026-04-29T08:00:00.000Z' })
  updatedAt: Date;
}
