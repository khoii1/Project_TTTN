import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TaskTemplateItemDto {
  @ApiProperty({ example: 'Gọi điện xác nhận nhu cầu' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title: string;

  @ApiPropertyOptional({ example: 'Gọi khách hàng để xác nhận nhu cầu tư vấn.' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: TaskPriority.HIGH, enum: TaskPriority })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(0)
  @IsOptional()
  dueAfterDays?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class TaskTemplateGroupDto {
  @ApiProperty({ example: 'Xác nhận thông tin khách hàng' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @ApiPropertyOptional({ example: 'Kiểm tra lại thông tin và nhu cầu.' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ type: [TaskTemplateItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskTemplateItemDto)
  @IsOptional()
  items?: TaskTemplateItemDto[];
}

export class CreateTaskTemplateDto {
  @ApiProperty({ example: 'Quy trình chăm sóc Lead từ Website' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @ApiPropertyOptional({ example: 'Dùng sau khi chuyển đổi Lead từ form tư vấn.' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ type: [TaskTemplateGroupDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskTemplateGroupDto)
  @IsOptional()
  groups?: TaskTemplateGroupDto[];
}

export class UpdateTaskTemplateDto extends CreateTaskTemplateDto {}

export class TaskTemplateItemResponseDto {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  dueAfterDays: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class TaskTemplateGroupResponseDto {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  items: TaskTemplateItemResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}

export class TaskTemplateResponseDto {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  groups: TaskTemplateGroupResponseDto[];
  groupCount: number;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}
