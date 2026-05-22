import {
  IsEmail,
  IsEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class LeadCaptureDto {
  @IsString()
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @MaxLength(160)
  company!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  companySize?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  preferredContactTime?: string;

  @IsString()
  @MaxLength(1000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyFaxHidden?: string;

  @IsEmpty({ message: 'Không được gửi field hệ thống.' })
  id?: string;

  @IsEmpty({ message: 'Không được gửi field hệ thống.' })
  organizationId?: string;

  @IsEmpty({ message: 'Không được gửi field hệ thống.' })
  ownerId?: string;

  @IsEmpty({ message: 'Không được gửi field hệ thống.' })
  source?: string;

  @IsEmpty({ message: 'Không được gửi field hệ thống.' })
  sourceDetail?: string;

  @IsEmpty({ message: 'Không được gửi field hệ thống.' })
  status?: string;

  @IsEmpty({ message: 'Không được gửi field hệ thống.' })
  convertedAt?: string;

  @IsEmpty({ message: 'Không được gửi field hệ thống.' })
  deletedAt?: string;
}
