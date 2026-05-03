import {
  IsString,
  IsOptional,
  IsEmail,
  IsNotEmpty,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { LeadStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeadDto {
  @ApiPropertyOptional({ example: 'Alice' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  firstName?: string;

  @ApiProperty({ example: 'Johnson' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: 'Tech Corp' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  company: string;

  @ApiPropertyOptional({ example: 'CTO' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  title?: string;

  @ApiPropertyOptional({ example: 'https://techcorp.com' })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ example: 'alice@techcorp.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+1-555-0101' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Website' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ example: 'Technology' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({ example: 'Interested in CRM demo' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateLeadDto {
  @ApiPropertyOptional({ example: 'Alice' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Johnson' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({ example: 'Tech Corp' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  company?: string;

  @ApiPropertyOptional({ example: 'CTO' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  title?: string;

  @ApiPropertyOptional({ example: 'https://techcorp.com' })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ example: 'alice@techcorp.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+1-555-0101' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'LinkedIn' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ example: 'Technology' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({ example: 'Updated note about the lead' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class ChangeLeadStatusDto {
  @ApiProperty({ example: LeadStatus.QUALIFIED, enum: LeadStatus })
  @IsEnum(LeadStatus)
  @IsNotEmpty()
  status: LeadStatus;
}

export class ConvertLeadDto {
  @ApiPropertyOptional({ example: 'Decision Maker' })
  @IsString()
  @IsOptional()
  contactTitle?: string;

  @ApiPropertyOptional({ example: 'Enterprise' })
  @IsString()
  @IsOptional()
  accountType?: string;
}

export class LeadResponseDto {
  @ApiProperty({ example: '2f1e9c77-4cc8-4f5f-9a9a-6f6b4b6a1111' })
  id: string;
  @ApiPropertyOptional({ example: 'Alice' })
  firstName?: string;
  @ApiProperty({ example: 'Johnson' })
  lastName: string;
  @ApiProperty({ example: 'Tech Corp' })
  company: string;
  @ApiPropertyOptional({ example: 'CTO' })
  title?: string;
  @ApiPropertyOptional({ example: 'https://techcorp.com' })
  website?: string;
  @ApiPropertyOptional({ example: 'alice@techcorp.com' })
  email?: string;
  @ApiPropertyOptional({ example: '+1-555-0101' })
  phone?: string;
  @ApiProperty({ example: LeadStatus.NEW, enum: LeadStatus })
  status: LeadStatus;
  @ApiPropertyOptional({ example: 'Website' })
  source?: string;
  @ApiPropertyOptional({ example: 'Technology' })
  industry?: string;
  @ApiPropertyOptional({ example: 'Interested in CRM demo' })
  description?: string;
  @ApiPropertyOptional({ example: '11111111-1111-1111-1111-111111111111' })
  convertedAccountId?: string;
  @ApiPropertyOptional({ example: '22222222-2222-2222-2222-222222222222' })
  convertedContactId?: string;
  @ApiPropertyOptional({ example: '33333333-3333-3333-3333-333333333333' })
  convertedOpportunityId?: string;
  @ApiProperty({ example: '44444444-4444-4444-4444-444444444444' })
  ownerId: string;
  @ApiProperty({ example: '55555555-5555-5555-5555-555555555555' })
  organizationId: string;
  @ApiProperty({ example: '2026-04-29T08:00:00.000Z' })
  createdAt: Date;
  @ApiProperty({ example: '2026-04-29T08:00:00.000Z' })
  updatedAt: Date;
}
