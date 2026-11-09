import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import cookieParser = require('cookie-parser');
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';

describe('Product Catalog & Image Management (E2E)', () => {
  let app: INestApplication;
  let ownerCookie: string;
  let branchAdminCookie: string;
  let createdProductId: string;
  let uploadedImageId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    // 1. Authenticate Owner
    const ownerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner@furniture.com', password: 'Owner@123456' });
    const rawOwnerCookies = ownerRes.headers['set-cookie'];
    const ownerCookies = Array.isArray(rawOwnerCookies) ? rawOwnerCookies : [rawOwnerCookies];
    ownerCookie = ownerCookies.find((c: string) => c.startsWith('agy_session='))!;

    // 2. Authenticate Branch Admin
    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin.bole@furniture.com', password: 'Admin@123456' });
    const rawAdminCookies = adminRes.headers['set-cookie'];
    const adminCookies = Array.isArray(rawAdminCookies) ? rawAdminCookies : [rawAdminCookies];
    branchAdminCookie = adminCookies.find((c: string) => c.startsWith('agy_session='))!;

    // Clean up any test product from prior runs
    const prisma = app.get(PrismaService);
    await prisma.product.deleteMany({
      where: { sku: 'SKU-TEST-ARM-01' },
    });
  });

  afterAll(async () => {
    if (app) {
      const prisma = app.get(PrismaService);
      await prisma.product.deleteMany({
        where: { sku: 'SKU-TEST-ARM-01' },
      });
      await app.close();
    }
  });

  it('1. GET /products lists all seeded catalog products', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/products')
      .set('Cookie', [branchAdminCookie])
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(6);
  });

  it('2. GET /products with category filter returns matching items', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/products?category=Office')
      .set('Cookie', [branchAdminCookie])
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].category).toBe('Office');
  });

  it('3. Owner creates a new furniture product', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Cookie', [ownerCookie])
      .send({
        sku: 'SKU-TEST-ARM-01',
        name: 'Ergonomic Leather Armchair',
        category: 'Living Room',
        description: 'Genuine leather executive accent armchair',
        dimensions: '85cm x 80cm x 90cm',
        basePrice: 32000.0,
        estimatedProductionDays: 5,
        isActive: true,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.sku).toBe('SKU-TEST-ARM-01');
    expect(res.body.data.basePrice).toBe(32000);
    createdProductId = res.body.data.id;
  });

  it('4. Rejects duplicate SKU with 409 Conflict', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Cookie', [ownerCookie])
      .send({
        sku: 'SKU-TEST-ARM-01',
        name: 'Another Armchair with Same SKU',
        category: 'Living Room',
        basePrice: 25000,
      })
      .expect(409);

    expect(res.body.success).toBe(false);
  });

  it('5. Branch Admin cannot create product (rejected with 403 Forbidden)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Cookie', [branchAdminCookie])
      .send({
        sku: 'SKU-UNAUTH-01',
        name: 'Unauthorized Chair',
        category: 'Living Room',
        basePrice: 10000,
      })
      .expect(403);
  });

  it('6. Rejects fake image file with invalid magic bytes (400 Bad Request)', async () => {
    const fakeFileBuffer = Buffer.from('<html><body>Fake Image Script</body></html>');

    const res = await request(app.getHttpServer())
      .post(`/api/v1/products/${createdProductId}/images`)
      .set('Cookie', [ownerCookie])
      .attach('image', fakeFileBuffer, 'malicious.jpg')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Invalid image file signature');
  });

  it('7. Owner uploads a valid PNG image and receives processed WebP thumbnail metadata', async () => {
    // 1x1 transparent PNG buffer: 89 50 4E 47 0D 0A 1A 0A ...
    const validPngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );

    const res = await request(app.getHttpServer())
      .post(`/api/v1/products/${createdProductId}/images`)
      .set('Cookie', [ownerCookie])
      .attach('image', validPngBuffer, 'product-sample.png')
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.imageUrl).toContain('.webp');
    expect(res.body.data.thumbnailUrl).toContain('-thumb.webp');
    expect(res.body.data.isPrimary).toBe(true);
    uploadedImageId = res.body.data.id;
  });

  it('8. Owner can delete the uploaded image', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/products/${createdProductId}/images/${uploadedImageId}`)
      .set('Cookie', [ownerCookie])
      .expect(200);

    expect(res.body.success).toBe(true);

    // Verify product no longer has that image
    const prodRes = await request(app.getHttpServer())
      .get(`/api/v1/products/${createdProductId}`)
      .set('Cookie', [ownerCookie])
      .expect(200);

    expect(prodRes.body.data.images.length).toBe(0);
  });
});
