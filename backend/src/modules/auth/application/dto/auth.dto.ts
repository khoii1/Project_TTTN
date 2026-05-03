import { IsEmail, IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Apex Solutions' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  organizationName: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: 'john@apex.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Admin@12345' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(50)
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Admin@123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class AuthUserDto {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  id: string;

  @ApiProperty({ example: 'admin@example.com' })
  email: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'ADMIN' })
  role: string;

  @ApiProperty({ example: 'd68a0d2d-8b4f-4e76-9d3e-1d9a5f2a1111' })
  organizationId: string;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  refreshToken: string;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}
