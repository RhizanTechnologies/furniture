import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import cookieParser = require('cookie-parser');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { PaymentType } from '@furniture/shared';

describe('Payments, Expenses & Financial Management (E2E) - Prompt 7', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let boleAdminCookie: string;
  let centralAdminCookie: string;

  let boleBranchId: string;
  let centralBranchId: string;
  let testOrderId: string;
  let finalStageId: string;

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

    // 3. Authenticate Central Admin
    const centralRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin.central@furniture.com', password: 'Admin@123456' })
      .expect(200);
    centralAdminCookie = centralRes.headers['set-cookie'];

    const boleBranch = await prisma.branch.findUnique({ where: { code: 'BR-BOLE' } });
    const centralBranch = await prisma.branch.findUnique({ where: { code: 'BR-MAIN' } });
    boleBranchId = boleBranch!.id;
    centralBranchId = centralBranch!.id;

    const initialStage = await prisma.orderStage.findFirst({ orderBy: { sequenceOrder: 'asc' } });
    const finalStage = await prisma.orderStage.findFirst({ where: { isFinalStage: true } });
    finalStageId = finalStage!.id;

    // Create a customer & order in Bole branch for payment testing
    const customer = await prisma.customer.create({
      data: {
        fullName: 'Finance Test Customer',
        phone: '+251911888771',
        branch: { connect: { id: boleBranchId } },
      },
    });

    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-FIN-TEST-001',
        customer: { connect: { id: customer.id } },
        branch: { connect: { id: boleBranchId } },
        currentStage: { connect: { id: initialStage!.id } },
        totalAgreedPrice: 80000.0,
        totalPaid: 30000.0,
        outstandingBalance: 50000.0,
        deadlineDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });
    testOrderId = order.id;

    // Record initial prepayment in Payment table
    await prisma.payment.create({
      data: {
        orderId: testOrderId,
        amount: 30000.0,
        paymentType: PaymentType.PREPAYMENT,
        paymentMethod: 'Cash',
        referenceNumber: 'INITIAL-PREPAY-001',
        recordedByUserId: (await prisma.user.findUnique({ where: { email: 'admin.bole@furniture.com' } }))!.id,
      },
    });
  });

  afterAll(async () => {
    if (testOrderId) {
      await prisma.payment.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.deleteMany({ where: { id: testOrderId } });
    }
    await prisma.expense.deleteMany({ where: { description: { contains: 'Test E2E Expense' } } });
    await prisma.idempotencyRecord.deleteMany({ where: { idempotencyKey: { contains: 'idem-test' } } });
    await prisma.customer.deleteMany({ where: { phone: '+251911888771' } });

    await app.close();
  });

  it('1. GET /api/v1/payments - verifies initial prepayment is recorded and balance is calculated correctly', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/payments?orderId=${testOrderId}`)
      .set('Cookie', boleAdminCookie)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].amount).toBe(30000.0);
    expect(res.body.data[0].paymentType).toBe(PaymentType.PREPAYMENT);

    // Verify order balances
    const orderRes = await request(app.getHttpServer())
      .get(`/api/v1/orders/${testOrderId}`)
      .set('Cookie', boleAdminCookie)
      .expect(200);

    expect(orderRes.body.data.totalAgreedPrice).toBe(80000.0);
    expect(orderRes.body.data.totalPaid).toBe(30000.0);
    expect(orderRes.body.data.outstandingBalance).toBe(50000.0);
  });

  it('2. POST /api/v1/payments - records an additional progress payment (25,000 ETB)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Cookie', boleAdminCookie)
      .send({
        orderId: testOrderId,
        amount: 25000.0,
        paymentType: PaymentType.PROGRESS_PAYMENT,
        paymentMethod: 'Bank Transfer',
        referenceNumber: 'CBE-TXN-9021',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.amount).toBe(25000.0);
    expect(res.body.data.paymentType).toBe(PaymentType.PROGRESS_PAYMENT);

    // Verify order balances updated: totalPaid = 55,000, outstandingBalance = 25,000
    const orderRes = await request(app.getHttpServer())
      .get(`/api/v1/orders/${testOrderId}`)
      .set('Cookie', boleAdminCookie)
      .expect(200);

    expect(orderRes.body.data.totalPaid).toBe(55000.0);
    expect(orderRes.body.data.outstandingBalance).toBe(25000.0);
  });

  it('3. POST /api/v1/payments - overpayment is strictly rejected with 400 Bad Request', async () => {
    // Current outstanding balance is 25,000 ETB.
    // Attempting to pay 30,000 ETB must fail!
    const res = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Cookie', boleAdminCookie)
      .send({
        orderId: testOrderId,
        amount: 30000.0,
        paymentMethod: 'Cash',
      })
      .expect(400);

    expect(res.body.message).toContain('exceeds current outstanding balance');
  });

  it('4. POST /api/v1/payments - records final settlement payment (25,000 ETB) and marks order fully paid', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Cookie', boleAdminCookie)
      .send({
        orderId: testOrderId,
        amount: 25000.0,
        paymentMethod: 'Telebirr',
        referenceNumber: 'TB-99887766',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.amount).toBe(25000.0);
    expect(res.body.data.paymentType).toBe(PaymentType.FINAL_SETTLEMENT);

    // Verify order balances: totalPaid = 80,000, outstandingBalance = 0.00
    const orderRes = await request(app.getHttpServer())
      .get(`/api/v1/orders/${testOrderId}`)
      .set('Cookie', boleAdminCookie)
      .expect(200);

    expect(orderRes.body.data.totalPaid).toBe(80000.0);
    expect(orderRes.body.data.outstandingBalance).toBe(0.0);
  });

  it('5. Idempotency Protection - duplicate payment submissions return existing record without double-charging', async () => {
    // Create a new order with 10,000 ETB
    const customer = await prisma.customer.findFirst({ where: { phone: '+251911888771' } });
    const initialStage = await prisma.orderStage.findFirst({ orderBy: { sequenceOrder: 'asc' } });

    const newOrder = await prisma.order.create({
      data: {
        orderNumber: 'ORD-IDEM-001',
        customer: { connect: { id: customer!.id } },
        branch: { connect: { id: boleBranchId } },
        currentStage: { connect: { id: initialStage!.id } },
        totalAgreedPrice: 10000.0,
        totalPaid: 0.0,
        outstandingBalance: 10000.0,
        deadlineDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
    });

    const idempotencyKey = 'idem-test-pay-12345';

    // First attempt: should succeed and record payment of 4,000 ETB
    const firstRes = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Cookie', boleAdminCookie)
      .send({
        orderId: newOrder.id,
        amount: 4000.0,
        idempotencyKey,
      })
      .expect(201);

    expect(firstRes.body.data.amount).toBe(4000.0);

    // Second attempt with exact same idempotencyKey (e.g. network retry):
    // MUST return the existing payment and NOT decrement the balance again
    const secondRes = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Cookie', boleAdminCookie)
      .send({
        orderId: newOrder.id,
        amount: 4000.0,
        idempotencyKey,
      })
      .expect(201);

    expect(secondRes.body.data.id).toBe(firstRes.body.data.id);

    // Check order totalPaid is 4,000 ETB (NOT 8,000 ETB!)
    const orderCheck = await prisma.order.findUnique({ where: { id: newOrder.id } });
    expect(Number(orderCheck!.totalPaid)).toBe(4000.0);
    expect(Number(orderCheck!.outstandingBalance)).toBe(6000.0);

    // Cleanup
    await prisma.payment.deleteMany({ where: { orderId: newOrder.id } });
    await prisma.order.deleteMany({ where: { id: newOrder.id } });
  });

  it("6. Tenancy Authorization - Branch Admin cannot record payment for another branch's order (403)", async () => {
    // Central admin attempts to record payment for Bole branch's order
    await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Cookie', centralAdminCookie)
      .send({
        orderId: testOrderId,
        amount: 1000.0,
      })
      .expect(403);
  });

  it('7. POST /api/v1/expenses - records branch operating expenses and enterprise overhead', async () => {
    // 1. Bole Admin records branch expense
    const boleExp = await request(app.getHttpServer())
      .post('/api/v1/expenses')
      .set('Cookie', boleAdminCookie)
      .send({
        category: 'Workshop Supplies',
        amount: 3500.0,
        description: 'Test E2E Expense: Sandpaper and cutting discs',
        receiptRef: 'RCP-BL-01',
      })
      .expect(201);

    expect(boleExp.body.success).toBe(true);
    expect(boleExp.body.data.amount).toBe(3500.0);
    expect(boleExp.body.data.branchId).toBe(boleBranchId);

    // 2. Owner records central overhead expense (branchId = null)
    const ownerExp = await request(app.getHttpServer())
      .post('/api/v1/expenses')
      .set('Cookie', ownerCookie)
      .send({
        category: 'Utilities',
        amount: 8000.0,
        description: 'Test E2E Expense: Factory electricity bill',
        receiptRef: 'EEU-INV-99',
      })
      .expect(201);

    expect(ownerExp.body.success).toBe(true);
    expect(ownerExp.body.data.amount).toBe(8000.0);
    expect(ownerExp.body.data.branchId).toBeNull();
  });

  it('8. GET /api/v1/expenses - enforces tenancy isolation on expense listings', async () => {
    // Bole Admin views expenses: must only see Bole expenses, not Owner central overhead
    const boleRes = await request(app.getHttpServer())
      .get('/api/v1/expenses')
      .set('Cookie', boleAdminCookie)
      .expect(200);

    expect(boleRes.body.success).toBe(true);
    const hasCentralOverhead = boleRes.body.data.some((e: any) => e.branchId === null);
    expect(hasCentralOverhead).toBe(false);

    // Owner views expenses: sees all
    const ownerRes = await request(app.getHttpServer())
      .get('/api/v1/expenses')
      .set('Cookie', ownerCookie)
      .expect(200);

    expect(ownerRes.body.success).toBe(true);
    expect(ownerRes.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('9. GET /api/v1/financial/summary - calculates authoritative revenue, receivables, gross and net profit', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/financial/summary')
      .set('Cookie', ownerCookie)
      .expect(200);

    expect(res.body.success).toBe(true);
    const summary = res.body.data;

    // Check financial integrity
    expect(summary.totalContractedRevenue).toBeGreaterThan(0);
    expect(summary.totalCashCollected).toBeGreaterThan(0);
    expect(summary.totalOperatingExpenses).toBeGreaterThan(0);
    expect(summary.grossProfit).toBeDefined();
    expect(summary.netProfit).toBeDefined();

    // Verify cash received is distinct from receivables
    expect(typeof summary.totalReceivables).toBe('number');
    expect(Array.isArray(summary.branchBreakdown)).toBe(true);
  });
});
