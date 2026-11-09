import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import cookieParser = require('cookie-parser');
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';

describe('Customers, Orders & Customizable Stages (E2E)', () => {
  let app: INestApplication;
  let ownerCookie: string;
  let boleAdminCookie: string;
  let centralAdminCookie: string;
  let customerId: string;
  let customStageId: string;
  let createdOrderId: string;

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

    // 2. Authenticate Bole Branch Admin
    const boleRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin.bole@furniture.com', password: 'Admin@123456' });
    const rawBoleCookies = boleRes.headers['set-cookie'];
    const boleCookies = Array.isArray(rawBoleCookies) ? rawBoleCookies : [rawBoleCookies];
    boleAdminCookie = boleCookies.find((c: string) => c.startsWith('agy_session='))!;

    // 3. Authenticate Central Branch Admin
    const centralRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin.central@furniture.com', password: 'Admin@123456' });
    const rawCentralCookies = centralRes.headers['set-cookie'];
    const centralCookies = Array.isArray(rawCentralCookies) ? rawCentralCookies : [rawCentralCookies];
    centralAdminCookie = centralCookies.find((c: string) => c.startsWith('agy_session='))!;

    // Clean up any test records
    const prisma = app.get(PrismaService);
    await prisma.payment.deleteMany({
      where: { order: { customer: { phone: '+251911990011' } } },
    });
    await prisma.orderStageHistory.deleteMany({
      where: { order: { customer: { phone: '+251911990011' } } },
    });
    await prisma.orderItem.deleteMany({
      where: { order: { customer: { phone: '+251911990011' } } },
    });
    await prisma.order.deleteMany({
      where: { customer: { phone: '+251911990011' } },
    });
    await prisma.customer.deleteMany({
      where: { phone: '+251911990011' },
    });
    await prisma.orderStage.deleteMany({
      where: { name: 'Custom Finishing & Waxing' },
    });
  });

  afterAll(async () => {
    if (app) {
      const prisma = app.get(PrismaService);
      await prisma.payment.deleteMany({
        where: { order: { customer: { phone: '+251911990011' } } },
      });
      await prisma.orderStageHistory.deleteMany({
        where: { order: { customer: { phone: '+251911990011' } } },
      });
      await prisma.orderItem.deleteMany({
        where: { order: { customer: { phone: '+251911990011' } } },
      });
      await prisma.order.deleteMany({
        where: { customer: { phone: '+251911990011' } },
      });
      await prisma.customer.deleteMany({
        where: { phone: '+251911990011' },
      });
      await prisma.orderStage.deleteMany({
        where: { name: 'Custom Finishing & Waxing' },
      });
      await app.close();
    }
  });

  it('1. Branch Admin registers a walk-in customer', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Cookie', [boleAdminCookie])
      .send({
        fullName: 'Solomon Getachew',
        phone: '+251911990011',
        email: 'solomon@example.com',
        address: 'Bole Atlas, Addis Ababa',
        notes: 'Interested in bespoke 8-seater dining table',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.fullName).toBe('Solomon Getachew');
    expect(res.body.data.phone).toBe('+251911990011');
    customerId = res.body.data.id;
  });

  it('2. Rejects duplicate customer phone number with 409 Conflict', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Cookie', [boleAdminCookie])
      .send({
        fullName: 'Solomon G. Duplicate',
        phone: '+251911990011',
      })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('already exists');
  });

  it('3. Owner creates a customizable order stage', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/order-stages')
      .set('Cookie', [ownerCookie])
      .send({
        name: 'Custom Finishing & Waxing',
        color: '#D97706',
        sequenceOrder: 5,
        isFinalStage: false,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Custom Finishing & Waxing');
    customStageId = res.body.data.id;
  });

  it('4. Branch Admin cannot create custom stages (rejected with 403 Forbidden)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/order-stages')
      .set('Cookie', [boleAdminCookie])
      .send({
        name: 'Unauthorized Stage',
      })
      .expect(403);
  });

  it('5. Branch Admin creates an order with items and initial prepayment', async () => {
    const deadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Cookie', [boleAdminCookie])
      .send({
        customerId,
        items: [
          {
            itemDescription: 'Grand Wanza 8-Seater Dining Set (Bespoke Dark Stain)',
            quantity: 1,
            unitPrice: 85000.0,
          },
        ],
        totalAgreedPrice: 85000.0,
        prepaymentAmount: 45000.0,
        deadlineDate: deadline,
        notes: 'Prepayment deposited via Telebirr',
        paymentMethod: 'Telebirr',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.orderNumber).toMatch(/^ORD-\d{4}-\d{5}$/);
    expect(res.body.data.totalAgreedPrice).toBe(85000);
    expect(res.body.data.totalPaid).toBe(45000);
    expect(res.body.data.outstandingBalance).toBe(40000);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.stageHistories.length).toBeGreaterThanOrEqual(1);
    createdOrderId = res.body.data.id;
  });

  it('6. Branch Admin advances the order stage and audit trail is recorded', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/orders/${createdOrderId}/stage`)
      .set('Cookie', [boleAdminCookie])
      .send({
        toStageId: customStageId,
        notes: 'Carpentry finished. Transitioning to custom waxing.',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.currentStageId).toBe(customStageId);
    expect(res.body.data.stageHistories.length).toBe(2);

    const latestHistory = res.body.data.stageHistories[res.body.data.stageHistories.length - 1];
    expect(latestHistory.toStageId).toBe(customStageId);
    expect(latestHistory.notes).toBe('Carpentry finished. Transitioning to custom waxing.');
  });

  it('7. Central Branch Admin CANNOT access Bole Branch order (Cross-branch rejected with 403)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/orders/${createdOrderId}`)
      .set('Cookie', [centralAdminCookie])
      .expect(403);

    expect(res.body.success).toBe(false);
  });

  it('8. Central Branch Admin CANNOT modify Bole Branch order stage (Cross-branch rejected with 403)', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${createdOrderId}/stage`)
      .set('Cookie', [centralAdminCookie])
      .send({
        toStageId: customStageId,
        notes: 'Malicious cross-branch stage change',
      })
      .expect(403);
  });

  it('9. Rejects deletion of an order stage that is currently in use by an active order (409 Conflict)', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/order-stages/${customStageId}`)
      .set('Cookie', [ownerCookie])
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('associated with existing or historical orders');
  });
});
