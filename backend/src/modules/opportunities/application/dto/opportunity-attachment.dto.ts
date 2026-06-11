import { ApiProperty } from '@nestjs/swagger';

export class OpportunityAttachmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  opportunityId: string;

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

  @ApiProperty({ required: false })
  signedUrl?: string;

  @ApiProperty()
  uploadedById: string;

  @ApiProperty()
  uploadedByName: string;

  @ApiProperty()
  uploadedByEmail: string;

  @ApiProperty()
  createdAt: Date;
}
