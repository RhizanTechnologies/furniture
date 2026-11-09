import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { ProductDto, ProductImageDto } from '@furniture/shared';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async listProducts(query: ProductQueryDto): Promise<ProductDto[]> {
    const where: Prisma.ProductWhereInput = {};

    if (query.category) {
      where.category = { equals: query.category, mode: 'insensitive' };
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((p) => this.mapProductToDto(p));
  }

  async getProduct(id: string): Promise<ProductDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return this.mapProductToDto(product);
  }

  async createProduct(dto: CreateProductDto): Promise<ProductDto> {
    const existing = await this.prisma.product.findUnique({
      where: { sku: dto.sku.trim().toUpperCase() },
    });

    if (existing) {
      throw new ConflictException(`A product with SKU "${dto.sku}" already exists`);
    }

    const product = await this.prisma.product.create({
      data: {
        sku: dto.sku.trim().toUpperCase(),
        name: dto.name.trim(),
        category: dto.category.trim(),
        description: dto.description?.trim() || null,
        dimensions: dto.dimensions?.trim() || null,
        basePrice: new Prisma.Decimal(dto.basePrice),
        estimatedProductionDays: dto.estimatedProductionDays || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        images: true,
      },
    });

    return this.mapProductToDto(product);
  }

  async updateProduct(id: string, dto: UpdateProductDto): Promise<ProductDto> {
    await this.getProduct(id);

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.category && { category: dto.category.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.dimensions !== undefined && { dimensions: dto.dimensions?.trim() || null }),
        ...(dto.basePrice !== undefined && { basePrice: new Prisma.Decimal(dto.basePrice) }),
        ...(dto.estimatedProductionDays !== undefined && {
          estimatedProductionDays: dto.estimatedProductionDays,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
      },
    });

    return this.mapProductToDto(updated);
  }

  async uploadProductImage(
    productId: string,
    file: Express.Multer.File,
  ): Promise<ProductImageDto> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { images: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }

    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    // Process and store image securely
    const processed = await this.storage.processAndStore(file);

    // If product has no images yet, make this image primary
    const isFirstImage = product.images.length === 0;

    const imageRecord = await this.prisma.productImage.create({
      data: {
        productId,
        imageUrl: processed.imageUrl,
        thumbnailUrl: processed.thumbnailUrl,
        fileSizeBytes: processed.fileSizeBytes,
        mimeType: processed.mimeType,
        isPrimary: isFirstImage,
        sortOrder: product.images.length,
      },
    });

    return this.mapImageToDto(imageRecord);
  }

  async deleteProductImage(productId: string, imageId: string): Promise<void> {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });

    if (!image) {
      throw new NotFoundException(`Image "${imageId}" not found for this product`);
    }

    // Delete files from storage
    await this.storage.deleteFile(image.imageUrl);
    if (image.thumbnailUrl) {
      await this.storage.deleteFile(image.thumbnailUrl);
    }

    // Delete record from database
    await this.prisma.productImage.delete({
      where: { id: imageId },
    });

    // If deleted image was primary, set next available image as primary
    if (image.isPrimary) {
      const nextImage = await this.prisma.productImage.findFirst({
        where: { productId },
        orderBy: { sortOrder: 'asc' },
      });
      if (nextImage) {
        await this.prisma.productImage.update({
          where: { id: nextImage.id },
          data: { isPrimary: true },
        });
      }
    }
  }

  async setPrimaryImage(productId: string, imageId: string): Promise<ProductDto> {
    await this.getProduct(productId);

    await this.prisma.$transaction([
      this.prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      }),
      this.prisma.productImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      }),
    ]);

    return this.getProduct(productId);
  }

  private mapProductToDto(p: any): ProductDto {
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      description: p.description,
      dimensions: p.dimensions,
      basePrice: Number(p.basePrice),
      estimatedProductionDays: p.estimatedProductionDays,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      images: (p.images || []).map((img: any) => this.mapImageToDto(img)),
    };
  }

  private mapImageToDto(img: any): ProductImageDto {
    return {
      id: img.id,
      productId: img.productId,
      imageUrl: img.imageUrl,
      thumbnailUrl: img.thumbnailUrl,
      isPrimary: img.isPrimary,
      fileSizeBytes: img.fileSizeBytes,
      mimeType: img.mimeType,
      sortOrder: img.sortOrder,
      createdAt: img.createdAt.toISOString(),
    };
  }
}
