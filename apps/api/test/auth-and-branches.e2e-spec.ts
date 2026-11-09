import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import cookieParser = require('cookie-parser');
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';
import { StockMode } from '@furniture/shared';

describe('Auth & Branch Access Control (E2E)', () => {
  let app: INestApplication;
  let ownerCookie: string;
  let boleAdminCookie: string;
  let createdBranchId: string;
  let boleBranchId: string;
  let centralBranchId: string;

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

    // Clean up any test records from prior runs
    const prisma = app.get(PrismaService);
    await prisma.user.deleteMany({
      where: { email: { in: ['admin.hawassa@furniture.com', 'admin.test@furniture.com'] } },
    });
    await prisma.branch.deleteMany({
      where: { code: { in: ['BR-HAWASSA', 'BR-TEST'] } },
    });
  });

  afterAll(async () => {
    if (app) {
      const prisma = app.get(PrismaService);
      await prisma.user.deleteMany({
        where: { email: { in: ['admin.hawassa@furniture.com', 'admin.test@furniture.com'] } },
      });
      await prisma.branch.deleteMany({
        where: { code: { in: ['BR-HAWASSA', 'BR-TEST'] } },
      });
      await app.close();
    }
  });

  it('1. Rejects unauthenticated request to /branches with 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/branches')
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('2. Owner logs in successfully and receives agy_session cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@furniture.com',
        password: 'Owner@123456',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('OWNER');
    expect(res.body.data.user.email).toBe('owner@furniture.com');

    const rawCookies = res.headers['set-cookie'];
    expect(rawCookies).toBeDefined();
    const cookies: string[] = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
    ownerCookie = cookies.find((c: string) => c.startsWith('agy_session='))!;
    expect(ownerCookie).toBeDefined();
  });

  it('3. Owner can view all branches and retrieve seeded branch IDs', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/branches')
      .set('Cookie', [ownerCookie])
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);

    const central = res.body.data.find((b: any) => b.code === 'BR-MAIN');
    const bole = res.body.data.find((b: any) => b.code === 'BR-BOLE');

    expect(central).toBeDefined();
    expect(central.stockMode).toBe('MAIN_STOCK');
    expect(central.admin).toBeDefined();
    centralBranchId = central.id;

    expect(bole).toBeDefined();
    expect(bole.stockMode).toBe('BRANCH_STOCK');
    expect(bole.admin).toBeDefined();
    boleBranchId = bole.id;
  });

  it('4. Owner creates a new branch with BRANCH_STOCK mode', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/branches')
      .set('Cookie', [ownerCookie])
      .send({
        name: 'Hawassa Lakeside Showroom',
        code: 'BR-HAWASSA',
        address: 'Piazza, Hawassa',
        phone: '+251462201122',
        stockMode: StockMode.BRANCH_STOCK,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Hawassa Lakeside Showroom');
    expect(res.body.data.code).toBe('BR-HAWASSA');
    expect(res.body.data.stockMode).toBe('BRANCH_STOCK');
    createdBranchId = res.body.data.id;
  });

  it('5. Owner assigns an administrator to the newly created branch', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/branches/${createdBranchId}/admin`)
      .set('Cookie', [ownerCookie])
      .send({
        email: 'admin.hawassa@furniture.com',
        fullName: 'Fikadu Mamo',
        password: 'Admin@123456',
        phone: '+251933445566',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.admin).toBeDefined();
    expect(res.body.data.admin.email).toBe('admin.hawassa@furniture.com');
    expect(res.body.data.admin.role).toBe('BRANCH_ADMIN');
    expect(res.body.data.admin.branchId).toBe(createdBranchId);
  });

  it('6. Branch Admin (Bole) logs in and receives session', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin.bole@furniture.com',
        password: 'Admin@123456',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('BRANCH_ADMIN');
    expect(res.body.data.user.branchId).toBe(boleBranchId);

    const rawCookies = res.headers['set-cookie'];
    const cookies: string[] = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
    boleAdminCookie = cookies.find((c: string) => c.startsWith('agy_session='))!;
    expect(boleAdminCookie).toBeDefined();
  });

  it('7. Branch Admin is rejected from listing all branches (Owner only endpoint) with 403', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/branches')
      .set('Cookie', [boleAdminCookie])
      .expect(403);

    expect(res.body.success).toBe(false);
  });

  it('8. Branch Admin CAN view their own assigned branch details', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/branches/${boleBranchId}`)
      .set('Cookie', [boleAdminCookie])
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(boleBranchId);
    expect(res.body.data.code).toBe('BR-BOLE');
  });

  it('9. Branch Admin CANNOT access another branch details (Cross-Branch rejected with 403)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/branches/${centralBranchId}`)
      .set('Cookie', [boleAdminCookie])
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('not authorized to access or modify data for another branch');
  });

  it('10. Branch Admin CANNOT create a branch (rejected with 403)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/branches')
      .set('Cookie', [boleAdminCookie])
      .send({
        name: 'Unauthorized Branch',
        code: 'BR-UNAUTH',
        address: 'Illegal Street',
        stockMode: StockMode.MAIN_STOCK,
      })
      .expect(403);
  });
});
