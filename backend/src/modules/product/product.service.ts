import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  /** List active products only (soft-deleted rows are excluded). */
  async findAll(params: { skip?: number; take?: number; category?: string }) {
    const { skip = 0, take = 50, category } = params;
    const where = {
      deletedAt: null, // <-- the soft-delete filter
      ...(category ? { category } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: Math.min(take, 200),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { total, items };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  /**
   * SOFT delete: we don't remove the row, we stamp deletedAt.
   * Cheaper than a physical DELETE and fully reversible (see guide C7–C9).
   */
  async softDelete(id: string) {
    await this.findOne(id); // 404 if missing/already deleted
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Undo a soft delete. */
  async restore(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: null },
    });
  }
}
