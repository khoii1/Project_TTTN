import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { PasswordHasherService } from '../../../../infrastructure/security/password-hasher.service';
import { TokenService } from '../../../../infrastructure/security/token.service';
import { RegisterDto, LoginDto, AuthResponseDto } from '../dto/auth.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private passwordHasher: PasswordHasherService,
    private tokenService: TokenService
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    // Hash password
    const passwordHash = await this.passwordHasher.hash(dto.password);

    // Create organization
    const organization = await this.prisma.organization.create({
      data: {
        name: dto.organizationName,
      },
    });

    // Create user (ADMIN role for first user)
    const user = await this.prisma.user.create({
      data: {
        id: randomUUID(),
        organizationId: organization.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        passwordHash,
        role: 'ADMIN',
      },
    });

    // Generate tokens
    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
    });

    const refreshToken = this.tokenService.generateRefreshToken({
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
    });

    // Hash and save refresh token
    const refreshTokenHash = await this.passwordHasher.hash(refreshToken);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await this.passwordHasher.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate tokens
    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
    });

    const refreshToken = this.tokenService.generateRefreshToken({
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
    });

    // Hash and save refresh token
    const refreshTokenHash = await this.passwordHasher.hash(refreshToken);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.tokenService.verifyRefreshToken(refreshToken);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshTokenHash) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify refresh token hash
      const isTokenValid = await this.passwordHasher.compare(refreshToken, user.refreshTokenHash);

      if (!isTokenValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const newAccessToken = this.tokenService.generateAccessToken({
        sub: user.id,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
      });

      const newRefreshToken = this.tokenService.generateRefreshToken({
        sub: user.id,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
      });

      // Hash and save new refresh token
      const newRefreshTokenHash = await this.passwordHasher.hash(newRefreshToken);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: newRefreshTokenHash },
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }
}
