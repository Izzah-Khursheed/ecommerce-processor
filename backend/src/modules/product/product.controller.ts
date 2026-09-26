import {
  Controller,
  Get,
  Delete,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProductService } from './product.service';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  /** GET /products?skip=0&take=50&category=Mugs — active products only. */
  @Get()
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('category') category?: string,
  ) {
    return this.productService.findAll({
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      category,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  /** DELETE /products/:id — soft delete (row stays, marked deletedAt). */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  softDelete(@Param('id') id: string) {
    return this.productService.softDelete(id);
  }

  /** POST /products/:id/restore — undo a soft delete. */
  @Post(':id/restore')
  restore(@Param('id') id: string) {
    return this.productService.restore(id);
  }
}
