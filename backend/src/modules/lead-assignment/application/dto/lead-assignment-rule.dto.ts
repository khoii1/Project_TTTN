import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateLeadAssignmentRuleDto {
  @ApiProperty({ example: 'Thành phố Hồ Chí Minh' })
  @IsString()
  @MaxLength(120)
  provinceName: string;

  @ApiProperty({ example: 'Phường Bến Nghé' })
  @IsString()
  @MaxLength(120)
  wardName: string;

  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  @IsUUID()
  assigneeId: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateLeadAssignmentRuleDto {
  @ApiPropertyOptional({ example: 'Thành phố Hồ Chí Minh' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  provinceName?: string;

  @ApiPropertyOptional({ example: 'Phường Bến Nghé' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  wardName?: string;

  @ApiPropertyOptional({ example: '11111111-1111-1111-1111-111111111111' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class LeadAssignmentRuleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  provinceName: string;

  @ApiProperty()
  wardName: string;

  @ApiProperty()
  assigneeId: string;

  @ApiProperty()
  assigneeName: string;

  @ApiProperty()
  assigneeEmail: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
