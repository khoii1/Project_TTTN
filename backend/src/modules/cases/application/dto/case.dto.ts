import { IsString, IsOptional, IsNotEmpty, IsEnum, IsUUID } from 'class-validator';
import { CaseStatus, CasePriority } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCaseDto {
  @ApiProperty({ example: 'Integration issue with legacy system' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiPropertyOptional({ example: '11111111-1111-1111-1111-111111111111' })
  @IsUUID()
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional({ example: '22222222-2222-2222-2222-222222222222' })
  @IsUUID()
  @IsOptional()
  contactId?: string;

  @ApiPropertyOptional({ example: CasePriority.HIGH, enum: CasePriority })
  @IsEnum(CasePriority)
  @IsOptional()
  priority?: CasePriority;

  @ApiPropertyOptional({ example: 'EMAIL' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ example: 'Support inbox thread' })
  @IsString()
  @IsOptional()
  sourceDetail?: string;

  @ApiPropertyOptional({ example: 'Need to resolve data sync issues' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateCaseDto {
  @ApiPropertyOptional({ example: 'Integration issue with legacy system' })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiPropertyOptional({ example: CasePriority.HIGH, enum: CasePriority })
  @IsEnum(CasePriority)
  @IsOptional()
  priority?: CasePriority;

  @ApiPropertyOptional({ example: 'EMAIL' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ example: 'Support inbox thread' })
  @IsString()
  @IsOptional()
  sourceDetail?: string;

  @ApiPropertyOptional({ example: 'Need to resolve data sync issues' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class ChangeCaseStatusDto {
  @ApiProperty({ example: CaseStatus.WORKING, enum: CaseStatus })
  @IsEnum(CaseStatus)
  @IsNotEmpty()
  status: CaseStatus;
}

export class CaseResponseDto {
  @ApiProperty({ example: '99999999-9999-9999-9999-999999999999' })
  id: string;
  @ApiProperty({ example: 'Integration issue with legacy system' })
  subject: string;
  @ApiProperty({ example: CaseStatus.WORKING, enum: CaseStatus })
  status: CaseStatus;
  @ApiProperty({ example: CasePriority.HIGH, enum: CasePriority })
  priority: CasePriority;
  @ApiPropertyOptional({ example: 'EMAIL' })
  source?: string;
  @ApiPropertyOptional({ example: 'Support inbox thread' })
  sourceDetail?: string;
  @ApiPropertyOptional({ example: 'Need to resolve data sync issues' })
  description?: string;
  @ApiPropertyOptional({ example: '11111111-1111-1111-1111-111111111111' })
  accountId?: string;
  @ApiPropertyOptional({ example: '22222222-2222-2222-2222-222222222222' })
  contactId?: string;
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
