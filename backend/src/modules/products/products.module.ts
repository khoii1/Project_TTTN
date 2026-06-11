import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { ProductCatalogService } from './application/services/product-catalog.service';
import { ProductsController } from './presentation/products.controller';
import { ProductPackagesController } from './presentation/product-packages.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController, ProductPackagesController],
  providers: [ProductCatalogService],
})
export class ProductsModule {}
