import { IsString, IsOptional, IsNotEmpty, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({ example: 'Follow up with Global Solutions' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiPropertyOptional({ example: '2026-05-30' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ example: TaskPriority.HIGH, enum: TaskPriority })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: 'ACCOUNT' })
  @IsString()
  @IsOptional()
  relatedType?: string;

  @ApiPropertyOptional({ example: '11111111-1111-1111-1111-111111111111' })
  @IsString()
  @IsOptional()
  relatedId?: string;

  @ApiPropertyOptional({ example: 'Schedule demo for enterprise software' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '66666666-6666-6666-6666-666666666666' })
  @IsUUID()
  @IsNotEmpty()
  assignedToId: string;
}

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 'Follow up with Global Solutions' })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiPropertyOptional({ example: '2026-05-30' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ example: TaskPriority.HIGH, enum: TaskPriority })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: 'Schedule demo for enterprise software' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '66666666-6666-6666-6666-666666666666' })
  @IsUUID()
  @IsOptional()
  assignedToId?: string;
}

export class CompleteTaskDto {
  @ApiProperty({ example: TaskStatus.COMPLETED, enum: TaskStatus })
  @IsEnum(TaskStatus)
  @IsNotEmpty()
  status: TaskStatus;
}

export class TaskResponseDto {
  @ApiProperty({ example: '77777777-7777-7777-7777-777777777777' })
  id: string;
  @ApiProperty({ example: 'Follow up with Global Solutions' })
  subject: string;
  @ApiPropertyOptional({ example: '2026-05-30T00:00:00.000Z' })
  dueDate?: Date;
  @ApiProperty({ example: TaskStatus.NOT_STARTED, enum: TaskStatus })
  status: TaskStatus;
  @ApiProperty({ example: TaskPriority.HIGH, enum: TaskPriority })
  priority: TaskPriority;
  @ApiPropertyOptional({ example: 'ACCOUNT' })
  relatedType?: string;
  @ApiPropertyOptional({ example: '11111111-1111-1111-1111-111111111111' })
  relatedId?: string;
  @ApiPropertyOptional({ example: 'Schedule demo for enterprise software' })
  description?: string;
  @ApiPropertyOptional({ example: '2026-05-30T12:00:00.000Z' })
  completedAt?: Date;
  @ApiProperty({ example: '44444444-4444-4444-4444-444444444444' })
  ownerId: string;
  @ApiProperty({ example: '66666666-6666-6666-6666-666666666666' })
  assignedToId: string;
  @ApiProperty({ example: '55555555-5555-5555-5555-555555555555' })
  organizationId: string;
  @ApiPropertyOptional({ example: '2026-04-29T08:00:00.000Z' })
  deletedAt?: Date;
  @ApiProperty({ example: '2026-04-29T08:00:00.000Z' })
  createdAt: Date;
  @ApiProperty({ example: '2026-04-29T08:00:00.000Z' })
  updatedAt: Date;
}
