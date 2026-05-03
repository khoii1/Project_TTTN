import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNoteDto {
  @ApiProperty({ example: 'Client wants Q3 implementation' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ example: 'ACCOUNT' })
  @IsString()
  @IsNotEmpty()
  relatedType: string;

  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  @IsString()
  @IsNotEmpty()
  relatedId: string;
}

export class UpdateNoteDto {
  @ApiProperty({ example: 'Updated note after follow-up call' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class NoteResponseDto {
  @ApiProperty({ example: '88888888-8888-8888-8888-888888888888' })
  id: string;
  @ApiProperty({ example: 'Client wants Q3 implementation' })
  content: string;
  @ApiProperty({ example: 'ACCOUNT' })
  relatedType: string;
  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  relatedId: string;
  @ApiProperty({ example: '44444444-4444-4444-4444-444444444444' })
  ownerId: string;
  @ApiProperty({ example: '55555555-5555-5555-5555-555555555555' })
  organizationId: string;
  @ApiProperty({ example: '2026-04-29T08:00:00.000Z' })
  createdAt: Date;
  @ApiProperty({ example: '2026-04-29T08:00:00.000Z' })
  updatedAt: Date;
}
