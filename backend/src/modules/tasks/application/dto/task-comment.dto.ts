import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTaskCommentDto {
  @ApiPropertyOptional({ example: 'Đã gọi khách, khách hẹn demo vào sáng mai.' })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  content?: string;
}

export class TaskCommentAttachmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty()
  originalName: string;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  fileSize: number;

  @ApiProperty()
  isImage: boolean;

  @ApiPropertyOptional()
  signedUrl?: string;

  @ApiProperty()
  createdAt: Date;
}

export class TaskCommentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  taskId: string;

  @ApiProperty()
  authorId: string;

  @ApiProperty()
  authorName: string;

  @ApiProperty()
  authorEmail: string;

  @ApiPropertyOptional()
  content?: string;

  @ApiProperty({ type: [TaskCommentAttachmentResponseDto] })
  attachments: TaskCommentAttachmentResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
