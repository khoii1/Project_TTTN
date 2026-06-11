import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtGuard } from '../../../shared/guards/jwt.guard';
import { RoleGuard } from '../../../shared/guards/role.guard';
import { TokenPayload } from '../../../infrastructure/security/token.service';
import {
  CreateProductPackageDto,
  ProductPackageResponseDto,
  UpdateProductPackageDto,
} from '../application/dto/product-catalog.dto';
import { ProductCatalogService } from '../application/services/product-catalog.service';

@ApiTags('Product Packages')
@Controller('product-packages')
@UseGuards(JwtGuard, RoleGuard)
@ApiBearerAuth()
export class ProductPackagesController {
  constructor(private productCatalogService: ProductCatalogService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List product packages in current organization' })
  findAll(
    @CurrentUser() user: TokenPayload,
  ): Promise<ProductPackageResponseDto[]> {
    return this.productCatalogService.findPackages(user.organizationId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get product package by ID' })
  findById(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<ProductPackageResponseDto> {
    return this.productCatalogService.findPackageById(id, user.organizationId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create product package' })
  create(
    @Body() dto: CreateProductPackageDto,
    @CurrentUser() user: TokenPayload,
  ): Promise<ProductPackageResponseDto> {
    return this.productCatalogService.createPackage(user.organizationId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update product package and replace items' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductPackageDto,
    @CurrentUser() user: TokenPayload,
  ): Promise<ProductPackageResponseDto> {
    return this.productCatalogService.updatePackage(id, user.organizationId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Deactivate product package' })
  deactivate(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<ProductPackageResponseDto> {
    return this.productCatalogService.deactivatePackage(id, user.organizationId);
  }
}
