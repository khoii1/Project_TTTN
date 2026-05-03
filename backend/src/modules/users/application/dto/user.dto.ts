import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsNotEmpty,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;
}

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(50)
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}

export class UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}
