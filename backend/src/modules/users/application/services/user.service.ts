import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { PasswordHasherService } from '../../../../infrastructure/security/password-hasher.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../dto/user.dto';
import { randomUUID } from 'crypto';
import { calculatePagination, calculateMeta } from '../../../../common/pagination/pagination.utils';
import { PaginatedResponse } from '../../../../common/types/response.types';
import { UserRole } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private passwordHasher: PasswordHasherService
  ) {}

  async create(organizationId: string, dto: CreateUserDto): Promise<UserResponseDto> {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    // Hash password
    const passwordHash = await this.passwordHasher.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        id: randomUUID(),
        organizationId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        passwordHash,
        role: dto.role,
      },
    });

    return this.mapToResponseDto(user);
  }

  async findById(userId: string, organizationId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToResponseDto(user);
  }

  async findAll(
    organizationId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    role?: UserRole
  ): Promise<PaginatedResponse<UserResponseDto>> {
    const { skip } = calculatePagination({ page, limit });

    const where: any = {
      organizationId,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((user) => this.mapToResponseDto(user)),
      meta: calculateMeta(page, limit, total),
    };
  }

  async update(
    userId: string,
    organizationId: string,
    dto: UpdateUserDto
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if new email is already used by another user
    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new BadRequestException('Email already in use');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName || user.firstName,
        lastName: dto.lastName || user.lastName,
        email: dto.email || user.email,
        role: dto.role || user.role,
      },
    });

    return this.mapToResponseDto(updatedUser);
  }

  async delete(userId: string, organizationId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });
  }

  private mapToResponseDto(user: any): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
