import { IsString, IsOptional, IsEmail, IsNotEmpty, MaxLength, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  @IsUUID()
  @IsNotEmpty()
  accountId: string;

  @ApiPropertyOptional({ example: 'David' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  firstName?: string;

  @ApiProperty({ example: 'Brown' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  lastName: string;

  @ApiPropertyOptional({ example: 'VP Sales' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  title?: string;

  @ApiPropertyOptional({ example: 'david@globalsolutions.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+1-555-0301' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'REFERRAL' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ example: 'Referred by existing customer' })
  @IsString()
  @IsOptional()
  sourceDetail?: string;

  @ApiPropertyOptional({ example: 'Important account contact' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'USA' })
  @IsString()
  @IsOptional()
  mailingCountry?: string;

  @ApiPropertyOptional({ example: '1 Market St' })
  @IsString()
  @IsOptional()
  mailingStreet?: string;

  @ApiPropertyOptional({ example: 'New York' })
  @IsString()
  @IsOptional()
  mailingCity?: string;

  @ApiPropertyOptional({ example: 'NY' })
  @IsString()
  @IsOptional()
  mailingState?: string;

  @ApiPropertyOptional({ example: '10001' })
  @IsString()
  @IsOptional()
  mailingPostalCode?: string;
}

export class UpdateContactDto {
  @ApiPropertyOptional({ example: 'David' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  firstName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  lastName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  title?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

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
  mailingCountry?: string;

  @IsString()
  @IsOptional()
  mailingStreet?: string;

  @IsString()
  @IsOptional()
  mailingCity?: string;

  @IsString()
  @IsOptional()
  mailingState?: string;

  @IsString()
  @IsOptional()
  mailingPostalCode?: string;
}

export class ContactResponseDto {
  @ApiProperty({ example: '22222222-2222-2222-2222-222222222222' })
  id: string;
  @ApiPropertyOptional({ example: 'David' })
  firstName?: string;
  @ApiProperty({ example: 'Brown' })
  lastName: string;
  @ApiPropertyOptional({ example: 'VP Sales' })
  title?: string;
  @ApiPropertyOptional({ example: 'david@globalsolutions.com' })
  email?: string;
  @ApiPropertyOptional({ example: '+1-555-0301' })
  phone?: string;
  @ApiPropertyOptional({ example: 'REFERRAL' })
  source?: string;
  @ApiPropertyOptional({ example: 'Referred by existing customer' })
  sourceDetail?: string;
  @ApiPropertyOptional({ example: 'Important account contact' })
  description?: string;
  @ApiPropertyOptional({ example: 'USA' })
  mailingCountry?: string;
  @ApiPropertyOptional({ example: '1 Market St' })
  mailingStreet?: string;
  @ApiPropertyOptional({ example: 'New York' })
  mailingCity?: string;
  @ApiPropertyOptional({ example: 'NY' })
  mailingState?: string;
  @ApiPropertyOptional({ example: '10001' })
  mailingPostalCode?: string;
  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  accountId: string;
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
