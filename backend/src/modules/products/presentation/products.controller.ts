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
  CreateProductDto,
  ProductResponseDto,
  UpdateProductDto,
} from '../application/dto/product-catalog.dto';
import { ProductCatalogService } from '../application/services/product-catalog.service';

@ApiTags('Products')
@Controller('products')
@UseGuards(JwtGuard, RoleGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(private productCatalogService: ProductCatalogService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List products in current organization' })
  findAll(@CurrentUser() user: TokenPayload): Promise<ProductResponseDto[]> {
    return this.productCatalogService.findProducts(user.organizationId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get product by ID' })
  findById(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<ProductResponseDto> {
    return this.productCatalogService.findProductById(id, user.organizationId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create product' })
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: TokenPayload,
  ): Promise<ProductResponseDto> {
    return this.productCatalogService.createProduct(user.organizationId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update product' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: TokenPayload,
  ): Promise<ProductResponseDto> {
    return this.productCatalogService.updateProduct(id, user.organizationId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Permanently delete an unused product' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<{ message: string }> {
    return this.productCatalogService.deleteProduct(id, user.organizationId);
  }
}
