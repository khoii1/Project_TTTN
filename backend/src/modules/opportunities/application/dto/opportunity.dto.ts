import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OpportunityStage } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOpportunityDto {
  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  @IsUUID()
  @IsNotEmpty()
  accountId: string;

  @ApiPropertyOptional({ example: '22222222-2222-2222-2222-222222222222' })
  @IsUUID()
  @IsOptional()
  contactId?: string;

  @ApiProperty({ example: 'Enterprise software deal' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 500000 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  closeDate?: string;

  @ApiPropertyOptional({ example: 'Send pricing proposal' })
  @IsString()
  @IsOptional()
  nextStep?: string;

  @ApiPropertyOptional({ example: 'CONVERTED_LEAD' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ example: 'Converted from Facebook lead' })
  @IsString()
  @IsOptional()
  sourceDetail?: string;

  @ApiPropertyOptional({ example: 'High-value enterprise deal' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateOpportunityDto {
  @ApiPropertyOptional({ example: 'Enterprise software deal' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 500000 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  closeDate?: string;

  @ApiPropertyOptional({ example: 'Send pricing proposal' })
  @IsString()
  @IsOptional()
  nextStep?: string;

  @ApiPropertyOptional({ example: 'CONVERTED_LEAD' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ example: 'Converted from Facebook lead' })
  @IsString()
  @IsOptional()
  sourceDetail?: string;

  @ApiPropertyOptional({ example: 'High-value enterprise deal' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class ChangeOpportunityStageDto {
  @ApiProperty({ example: OpportunityStage.PROPOSE, enum: OpportunityStage })
  @IsEnum(OpportunityStage)
  @IsNotEmpty()
  stage: OpportunityStage;
}

export class OpportunityResponseDto {
  @ApiProperty({ example: '33333333-3333-3333-3333-333333333333' })
  id: string;
  @ApiProperty({ example: 'Enterprise software deal' })
  name: string;
  @ApiProperty({ example: OpportunityStage.QUALIFY, enum: OpportunityStage })
  stage: OpportunityStage;
  @ApiPropertyOptional({ example: 500000 })
  amount?: number;
  @ApiPropertyOptional({ example: '2026-12-31T00:00:00.000Z' })
  closeDate?: Date;
  @ApiPropertyOptional({ example: 'Send pricing proposal' })
  nextStep?: string;
  @ApiPropertyOptional({ example: 'CONVERTED_LEAD' })
  source?: string;
  @ApiPropertyOptional({ example: 'Converted from Facebook lead' })
  sourceDetail?: string;
  @ApiPropertyOptional({ example: 'High-value enterprise deal' })
  description?: string;
  @ApiPropertyOptional({ example: '2026-05-11T08:48:00.000Z' })
  stageChangedAt?: Date;
  @ApiPropertyOptional({ example: '44444444-4444-4444-4444-444444444444' })
  stageChangedById?: string;
  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  accountId: string;
  @ApiPropertyOptional({ example: '22222222-2222-2222-2222-222222222222' })
  contactId?: string;
  @ApiProperty({ example: '44444444-4444-4444-4444-444444444444' })
  ownerId: string;
  @ApiProperty({ example: '55555555-5555-5555-5555-555555555555' })
  organizationId: string;
  @ApiPropertyOptional({ example: '2026-04-29T08:00:00.000Z' })
  deletedAt?: Date;
  @ApiPropertyOptional({ example: '44444444-4444-4444-4444-444444444444' })
  deletedById?: string;
  @ApiPropertyOptional({ example: '2026-05-11T08:48:00.000Z' })
  restoredAt?: Date;
  @ApiPropertyOptional({ example: '44444444-4444-4444-4444-444444444444' })
  restoredById?: string;
  @ApiProperty({ example: '2026-04-29T08:00:00.000Z' })
  createdAt: Date;
  @ApiProperty({ example: '2026-04-29T08:00:00.000Z' })
  updatedAt: Date;
}
