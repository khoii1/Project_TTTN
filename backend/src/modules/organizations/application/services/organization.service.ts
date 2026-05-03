import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

export interface OrganizationResponseDto {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export class OrganizationResponseDto {
  id!: string;
  name!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  async findById(organizationId: string): Promise<OrganizationResponseDto> {
    const organization = await this.prisma.organization.findFirst({
      where: {
        id: organizationId,
        deletedAt: null,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return {
      id: organization.id,
      name: organization.name,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }
}
