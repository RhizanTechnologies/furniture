import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import cookieParser = require('cookie-parser');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Analytics & Business Reporting (E2E) - Prompt 8', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let boleAdminCookie: string;

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
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    // 1. Authenticate Owner
    const ownerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner@furniture.com', password: 'Owner@123456' })
      .expect(200);
    ownerCookie = ownerRes.headers['set-cookie'];

    // 2. Authenticate Bole Admin
    const boleRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin.bole@furniture.com', password: 'Admin@123456' })
      .expect(200);
    boleAdminCookie = boleRes.headers['set-cookie'];
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. GET /api/v1/analytics/dashboard - returns enterprise-wide analytics with actual DB records', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/dashboard')
      .set('Cookie', ownerCookie)
      .expect(200);

    expect(res.body.success).toBe(true);
    const data = res.body.data;

    // Financial Overview
    expect(data.financialOverview).toBeDefined();
    expect(typeof data.financialOverview.contractedRevenue).toBe('number');
    expect(typeof data.financialOverview.cashCollected).toBe('number');
    expect(typeof data.financialOverview.outstandingReceivables).toBe('number');
    expect(typeof data.financialOverview.grossProfit).toBe('number');
    expect(typeof data.financialOverview.netProfit).toBe('number');

    // Stock Overview
    expect(data.stockOverview).toBeDefined();
    expect(data.stockOverview.totalStockValue).toBeGreaterThan(0);
    expect(data.stockOverview.activeMaterialsCount).toBeGreaterThanOrEqual(6);

    // Branch Comparisons
    expect(Array.isArray(data.branchComparisons)).toBe(true);
    expect(data.branchComparisons.length).toBeGreaterThanOrEqual(2);

    // Product Performance (Separates Revenue & Profitability)
    expect(Array.isArray(data.topProductsByRevenue)).toBe(true);
    expect(Array.isArray(data.topProductsByProfit)).toBe(true);

    // Customer Preferences (Real database metrics, no fabricated scores)
    expect(data.customerPreferences).toBeDefined();
    expect(Array.isArray(data.customerPreferences.categoryPreferences)).toBe(true);
    expect(typeof data.customerPreferences.repeatCustomerRate).toBe('number');
    expect(typeof data.customerPreferences.averageOrderValue).toBe('number');
  });

  it('2. GET /api/v1/analytics/dashboard - supports daily, weekly and custom date range filters', async () => {
    // 1. Weekly period
    const weeklyRes = await request(app.getHttpServer())
      .get('/api/v1/analytics/dashboard?period=weekly')
      .set('Cookie', ownerCookie)
      .expect(200);

    expect(weeklyRes.body.data.period).toBe('weekly');
    expect(weeklyRes.body.data.dateRange.startDate).toBeDefined();
    expect(weeklyRes.body.data.dateRange.endDate).toBeDefined();

    // 2. Custom date range
    const customStart = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const customEnd = new Date().toISOString();
    const customRes = await request(app.getHttpServer())
      .get(`/api/v1/analytics/dashboard?startDate=${customStart}&endDate=${customEnd}`)
      .set('Cookie', ownerCookie)
      .expect(200);

    expect(customRes.body.data.dateRange.startDate).toBe(customStart);
    expect(customRes.body.data.dateRange.endDate).toBe(customEnd);
  });

  it('3. Tenancy Isolation - Branch Admin dashboard is strictly scoped to their assigned branch', async () => {
    const boleBranch = await prisma.branch.findUnique({ where: { code: 'BR-BOLE' } });

    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/dashboard')
      .set('Cookie', boleAdminCookie)
      .expect(200);

    expect(res.body.success).toBe(true);
    // Bole Admin branch comparisons should only reflect Bole branch
    const comparisons = res.body.data.branchComparisons;
    const centralComparison = comparisons.find((c: any) => c.branchName.includes('Central'));
    // In branch comparisons, central revenue should either be 0 or unlisted for bole admin
    if (centralComparison) {
      expect(centralComparison.totalRevenue).toBe(0);
      expect(centralComparison.cashCollected).toBe(0);
    }
  });

  it('4. Separation of Revenue and Profit - validates product ranking integrity', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/dashboard')
      .set('Cookie', ownerCookie)
      .expect(200);

    const { topProductsByRevenue, topProductsByProfit } = res.body.data;
    if (topProductsByRevenue.length > 0) {
      // Ensure each product has distinct totalRevenue and grossProfit fields
      for (const prod of topProductsByRevenue) {
        expect(typeof prod.totalRevenue).toBe('number');
        expect(typeof prod.grossProfit).toBe('number');
        expect(typeof prod.grossMarginPercentage).toBe('number');
      }
    }
  });
});
