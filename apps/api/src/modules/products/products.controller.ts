import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, ProductDto, ProductImageDto, ApiResponse as ApiEnvelope } from '@furniture/shared';

@ApiTags('Products & Showroom')
@Controller('products')
@UseGuards(AuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List all furniture products and showroom catalog' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  async listProducts(@Query() query: ProductQueryDto): Promise<ApiEnvelope<ProductDto[]>> {
    const products = await this.productsService.listProducts(query);
    return {
      success: true,
      data: products,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product details by ID' })
  @ApiResponse({ status: 200, description: 'Product details retrieved' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProduct(@Param('id') id: string): Promise<ApiEnvelope<ProductDto>> {
    const product = await this.productsService.getProduct(id);
    return {
      success: true,
      data: product,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post()
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new furniture product catalog item (Owner only)' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  async createProduct(@Body() dto: CreateProductDto): Promise<ApiEnvelope<ProductDto>> {
    const product = await this.productsService.createProduct(dto);
    return {
      success: true,
      data: product,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Put(':id')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Update furniture product specifications (Owner only)' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ApiEnvelope<ProductDto>> {
    const product = await this.productsService.updateProduct(id, dto);
    return {
      success: true,
      data: product,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post(':id/images')
  @Roles(UserRole.OWNER)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a product photograph (Owner only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Image uploaded, processed and linked to product' })
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiEnvelope<ProductImageDto>> {
    const image = await this.productsService.uploadProductImage(id, file);
    return {
      success: true,
      data: image,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Delete(':id/images/:imageId')
  @Roles(UserRole.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a product photograph (Owner only)' })
  @ApiResponse({ status: 200, description: 'Image deleted from storage and database' })
  async deleteImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ): Promise<ApiEnvelope<{ message: string }>> {
    await this.productsService.deleteProductImage(id, imageId);
    return {
      success: true,
      data: { message: 'Image deleted successfully' },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Put(':id/images/:imageId/primary')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Set an image as primary product photograph (Owner only)' })
  @ApiResponse({ status: 200, description: 'Primary image updated' })
  async setPrimaryImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ): Promise<ApiEnvelope<ProductDto>> {
    const product = await this.productsService.setPrimaryImage(id, imageId);
    return {
      success: true,
      data: product,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}
