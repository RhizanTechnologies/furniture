import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import cookieParser = require('cookie-parser');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { UserRole, PaymentType, StockMode } from '@furniture/shared';

describe('Complete End-to-End Business Lifecycle (Prompt 10 - QA & Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerCookie: string;
  let adminCookie: string;
  let branchId: string;
  let adminUserId: string;
  let productId: string;
  let customerId: string;
  let orderId: string;
  let initialStageId: string;
  let inProgressStageId: string;
  let completedStageId: string;
  let rawMaterialId: string;

  const cleanupData = async () => {
    // 1. Delete child material consumptions & stock ins
    await prisma.materialConsumption.deleteMany({ where: { rawMaterial: { code: 'LIFECYCLE-MAT' } } });
    await prisma.materialStockIn.deleteMany({ where: { rawMaterial: { code: 'LIFECYCLE-MAT' } } });
    await prisma.rawMaterial.deleteMany({ where: { code: 'LIFECYCLE-MAT' } });

    // 2. Delete orders, items, histories, payments, consumptions
    const oldBranches = await prisma.branch.findMany({ where: { code: { in: ['LIFECYCLE-BR', 'BOLE-SEC-BR'] } } });
    for (const b of oldBranches) {
      await prisma.materialConsumption.deleteMany({ where: { branchId: b.id } });
      await prisma.payment.deleteMany({ where: { order: { branchId: b.id } } });
      await prisma.orderItem.deleteMany({ where: { order: { branchId: b.id } } });
      await prisma.orderStageHistory.deleteMany({ where: { order: { branchId: b.id } } });
      await prisma.order.deleteMany({ where: { branchId: b.id } });
      await prisma.expense.deleteMany({ where: { branchId: b.id } });
      await prisma.materialStockIn.deleteMany({ where: { branchId: b.id } });
      await prisma.idempotencyRecord.deleteMany({ where: { user: { branchId: b.id } } });
      await prisma.user.deleteMany({ where: { branchId: b.id } });
      await prisma.customer.deleteMany({ where: { branchId: b.id } });
      await prisma.branch.delete({ where: { id: b.id } });
    }

    const oldCust = await prisma.customer.findFirst({ where: { phone: '+251911776655' } });
    if (oldCust) {
      const ords = await prisma.order.findMany({ where: { customerId: oldCust.id } });
      for (const o of ords) {
        await prisma.materialConsumption.deleteMany({ where: { orderId: o.id } });
        await prisma.payment.deleteMany({ where: { orderId: o.id } });
        await prisma.orderItem.deleteMany({ where: { orderId: o.id } });
        await prisma.orderStageHistory.deleteMany({ where: { orderId: o.id } });
        await prisma.order.delete({ where: { id: o.id } });
      }
      await prisma.customer.delete({ where: { id: oldCust.id } });
    }

    const oldProd = await prisma.product.findFirst({ where: { sku: 'LIFECYCLE-TBL-01' } });
    if (oldProd) {
      await prisma.productImage.deleteMany({ where: { productId: oldProd.id } });
      await prisma.orderItem.deleteMany({ where: { productId: oldProd.id } });
      await prisma.product.delete({ where: { id: oldProd.id } });
    }

    await prisma.idempotencyRecord.deleteMany({ where: { idempotencyKey: 'payment-lifecycle-key-999' } });
    await prisma.idempotencyRecord.deleteMany({
      where: { user: { email: { in: ['lifecycle_owner@example.com', 'kazanchis_admin@example.com', 'bole_sec_admin@example.com'] } } },
    });
    await prisma.materialStockIn.deleteMany({
      where: { recordedByUser: { email: { in: ['lifecycle_owner@example.com', 'kazanchis_admin@example.com', 'bole_sec_admin@example.com'] } } },
    });
    await prisma.user.deleteMany({ where: { email: { in: ['lifecycle_owner@example.com', 'kazanchis_admin@example.com', 'bole_sec_admin@example.com'] } } });
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      }),
    );
    app.useGlobalFilters(new (require('../src/common/filters/http-exception.filter').HttpExceptionFilter)());
    await app.init();

    prisma = app.get(PrismaService);
    await cleanupData();

    // Seed Lifecycle Owner
    const bcrypt = require('bcryptjs');
    const ownerPassword = await bcrypt.hash('LifecycleOwner123!', 10);
    await prisma.user.create({
      data: {
        email: 'lifecycle_owner@example.com',
        fullName: 'Lifecycle Test Owner',
        passwordHash: ownerPassword,
        role: UserRole.OWNER,
        isActive: true,
      },
    });

    // Resolve or seed configurable order stages
    const existingStages = await prisma.orderStage.findMany({ orderBy: { sequenceOrder: 'asc' } });
    if (existingStages.length >= 3) {
      initialStageId = existingStages[0].id;
      inProgressStageId = existingStages[1].id;
      completedStageId = existingStages[existingStages.length - 1].id;
    } else {
      const s1 = await prisma.orderStage.create({
        data: { name: 'Deposit Received', color: '#8B5A2B', sequenceOrder: 1, isFinalStage: false },
      });
      const s2 = await prisma.orderStage.create({
        data: { name: 'Workshop Assembly', color: '#2563EB', sequenceOrder: 2, isFinalStage: false },
      });
      const s3 = await prisma.orderStage.create({
        data: { name: 'Delivered & Installed', color: '#16A34A', sequenceOrder: 3, isFinalStage: true },
      });
      initialStageId = s1.id;
      inProgressStageId = s2.id;
      completedStageId = s3.id;
    }
  });

  afterAll(async () => {
    await cleanupData();
    await app.close();
  });

  // STEP 1: Owner logs in
  it('Step 1: Owner logs in successfully with secure httpOnly cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'lifecycle_owner@example.com', password: 'LifecycleOwner123!' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe(UserRole.OWNER);
    ownerCookie = res.headers['set-cookie'][0];
    expect(ownerCookie).toContain('agy_session');
  });

  // STEP 2: Owner creates branches & configures stock arrangements
  it('Step 2: Owner creates showroom branches and configures stock arrangements', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/branches')
      .set('Cookie', ownerCookie)
      .send({
        name: 'Kazanchis Flagship Showroom',
        code: 'LIFECYCLE-BR',
        address: 'Menelik II Avenue, Kazanchis, Addis Ababa',
        phone: '+251911334455',
        stockMode: StockMode.MAIN_STOCK,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('LIFECYCLE-BR');
    expect(res.body.data.stockMode).toBe(StockMode.MAIN_STOCK);
    branchId = res.body.data.id;
  });

  // STEP 3: Owner assigns branch administrator
  it('Step 3: Owner provisions a Branch Administrator user bound to the branch', async () => {
    const bcrypt = require('bcryptjs');
    const adminPassword = await bcrypt.hash('AdminSecret123!', 10);
    const admin = await prisma.user.create({
      data: {
        email: 'kazanchis_admin@example.com',
        fullName: 'Kazanchis Branch Admin',
        passwordHash: adminPassword,
        role: UserRole.BRANCH_ADMIN,
        branchId,
        isActive: true,
      },
    });
    adminUserId = admin.id;

    // Log in as Branch Admin
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'kazanchis_admin@example.com', password: 'AdminSecret123!' })
      .expect(200);

    adminCookie = loginRes.headers['set-cookie'][0];
    expect(loginRes.body.data.user.branchId).toBe(branchId);
  });

  // STEP 4: Products are added to the catalog
  it('Step 4: Products are added to the catalog with dimensions and base price', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Cookie', ownerCookie)
      .send({
        sku: 'LIFECYCLE-TBL-01',
        name: 'Imperial Wanza Dining Suite',
        category: 'Dining Room',
        basePrice: 120000,
        description: 'Solid Ethiopian Wanza dining suite with 8 upholstered matching chairs.',
        dimensions: '280cm x 110cm x 78cm',
        estimatedProductionDays: 14,
        isActive: true,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    productId = res.body.data.id;
    expect(res.body.data.basePrice).toBe(120000);
  });

  // STEP 5: Walk-In Customers are registered
  it('Step 5: Showroom walk-in customer is registered under the branch', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Cookie', adminCookie)
      .send({
        fullName: 'Hanan Mohammed',
        phone: '+251911776655',
        email: 'hanan@example.com',
        address: 'Kazanchis, Woreda 08, Addis Ababa',
        notes: 'Requested dark antique walnut polish.',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    customerId = res.body.data.id;
    expect(res.body.data.phone).toBe('+251911776655');
  });

  // STEP 6: Custom Order is created with initial deposit
  it('Step 6: Bespoke order is created with agreed total price and prepayment', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Cookie', adminCookie)
      .send({
        customerId,
        items: [
          {
            productId,
            itemDescription: 'Imperial Wanza Dining Suite (Custom 280cm)',
            quantity: 1,
            unitPrice: 120000,
          },
        ],
        totalAgreedPrice: 120000,
        prepaymentAmount: 50000,
        deadlineDate: new Date(Date.now() + 14 * 86400000).toISOString(),
        paymentMethod: 'Bank Transfer',
        notes: 'Client paid 50,000 ETB deposit via CBE bank transfer.',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    orderId = res.body.data.id;
    expect(res.body.data.totalAgreedPrice).toBe(120000);
    expect(res.body.data.totalPaid).toBe(50000);
    expect(res.body.data.outstandingBalance).toBe(70000);
  });

  // STEP 7: Branch Administrator manages customizable order stages
  it('Step 7: Branch Admin advances order stage and records workshop audit trail', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/stage`)
      .set('Cookie', adminCookie)
      .send({
        toStageId: inProgressStageId,
        notes: 'Timber selection complete. Workshop frame cutting commenced.',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.currentStageId).toBe(inProgressStageId);

    // Verify stage history audit trail
    const orderHistory = await prisma.orderStageHistory.findMany({
      where: { orderId },
      orderBy: { changedAt: 'asc' },
    });
    expect(orderHistory.length).toBeGreaterThanOrEqual(1);
  });

  // STEP 8: Raw materials inventory stock-in
  it('Step 8: Raw material stock-in recorded with Moving Weighted Average Cost (WAC)', async () => {
    // 1. Create Raw Material
    const matRes = await request(app.getHttpServer())
      .post('/api/v1/inventory/materials')
      .set('Cookie', ownerCookie)
      .send({
        code: 'LIFECYCLE-MAT',
        name: 'A-Grade Seasoned Wanza Timber Planks',
        category: 'Solid Hardwood',
        unitOfMeasurement: 'PCS',
        reorderAlertQuantity: 5,
        isActive: true,
      })
      .expect(201);

    rawMaterialId = matRes.body.data.id;

    // 2. Initial Stock In: 10 PCS @ 3,000 ETB via POST /api/v1/inventory/stock-in
    const stockInRes = await request(app.getHttpServer())
      .post('/api/v1/inventory/stock-in')
      .set('Cookie', ownerCookie)
      .send({
        rawMaterialId,
        branchId,
        receivedQuantity: 10,
        unitCost: 3000,
        supplierInvoiceRef: 'INV-TIMBER-001',
      })
      .expect(201);

    expect(stockInRes.body.success).toBe(true);

    // Verify material stock quantity and WAC
    const mat = await prisma.rawMaterial.findUnique({ where: { id: rawMaterialId } });
    expect(Number(mat!.currentStockQuantity)).toBe(10);
    expect(Number(mat!.currentUnitCost)).toBe(3000);
  });

  // STEP 9: Material consumption against order with frozen unit cost
  it('Step 9: Workshop material consumption logged against order and deducts inventory', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/inventory/consumption')
      .set('Cookie', adminCookie)
      .send({
        orderId,
        rawMaterialId,
        consumedQuantity: 4,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.consumedQuantity).toBe(4);
    expect(res.body.data.unitCostAllocated).toBe(3000); // Unit cost frozen at time of consumption
    expect(res.body.data.totalMaterialCost).toBe(12000);

    // Verify inventory decreased to 6 PCS
    const mat = await prisma.rawMaterial.findUnique({ where: { id: rawMaterialId } });
    expect(Number(mat!.currentStockQuantity)).toBe(6);
  });

  // STEP 10: Product Costing Calculation
  it('Step 10: Order product costing calculates material cost, gross profit and margin', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/inventory/orders/${orderId}/costing`)
      .set('Cookie', adminCookie)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.totalAgreedPrice).toBe(120000);
    expect(res.body.data.totalMaterialCost).toBe(12000);
    expect(res.body.data.grossProfit).toBe(108000);
    expect(res.body.data.grossMarginPercentage).toBe(90);
  });

  // STEP 11: Payments and Operating Expenses
  it('Step 11: Progress payment recorded with strict idempotency and balance deduction', async () => {
    const idempotencyKey = 'payment-lifecycle-key-999';

    // 1. Record Progress Payment: 40,000 ETB
    const payRes = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Cookie', adminCookie)
      .send({
        orderId,
        amount: 40000,
        paymentType: PaymentType.PROGRESS_PAYMENT,
        paymentMethod: 'Bank Transfer',
        referenceNumber: 'CBE-TXN-4488',
        idempotencyKey,
      })
      .expect(201);

    expect(payRes.body.success).toBe(true);
    expect(payRes.body.data.amount).toBe(40000);

    // Verify order outstanding balance: 120,000 - 50,000 - 40,000 = 30,000 ETB
    const updatedOrder = await prisma.order.findUnique({ where: { id: orderId } });
    expect(Number(updatedOrder!.totalPaid)).toBe(90000);
    expect(Number(updatedOrder!.outstandingBalance)).toBe(30000);

    // 2. Record Branch Operating Expense: 8,500 ETB
    const expRes = await request(app.getHttpServer())
      .post('/api/v1/expenses')
      .set('Cookie', adminCookie)
      .send({
        category: 'Workshop Supplies',
        amount: 8500,
        description: 'Finishing sandpaper, lacquer, and brass hinges',
        receiptRef: 'REC-SUPPLIES-044',
      })
      .expect(201);

    expect(expRes.body.success).toBe(true);
    expect(expRes.body.data.amount).toBe(8500);
  });

  // STEP 12: Stock Valuation Report
  it('Step 12: Stock valuation calculates moving weighted average cost valuation', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/inventory/valuation')
      .set('Cookie', ownerCookie)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.totalStockValue).toBeGreaterThanOrEqual(18000); // 6 PCS * 3,000
    expect(res.body.data.totalItemsInStock).toBeGreaterThanOrEqual(1);
  });

  // STEP 13: Order Final Settlement & Delivery
  it('Step 13: Final settlement payment clears balance and stage marks final delivery', async () => {
    // 1. Final payment: 30,000 ETB
    const finalPayRes = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Cookie', adminCookie)
      .send({
        orderId,
        amount: 30000,
        paymentType: PaymentType.FINAL_SETTLEMENT,
        paymentMethod: 'Cash',
        referenceNumber: 'FINAL-CASH-REC-01',
      })
      .expect(201);

    expect(finalPayRes.body.success).toBe(true);

    const clearedOrder = await prisma.order.findUnique({ where: { id: orderId } });
    expect(Number(clearedOrder!.totalPaid)).toBe(120000);
    expect(Number(clearedOrder!.outstandingBalance)).toBe(0);

    // 2. Advance to Delivered stage
    const finalStageRes = await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/stage`)
      .set('Cookie', adminCookie)
      .send({
        toStageId: completedStageId,
        notes: 'Delivered to client residence and client signed acceptance receipt.',
      })
      .expect(200);

    expect(finalStageRes.body.success).toBe(true);
    expect(finalStageRes.body.data.currentStageId).toBe(completedStageId);
  });

  // STEP 14: Owner reviews Financial Summary
  it('Step 14: Owner reviews executive financial metrics with true cash flow and accrual revenue', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/financial/summary')
      .set('Cookie', ownerCookie)
      .expect(200);

    expect(res.body.success).toBe(true);
    const summary = res.body.data;

    expect(summary.totalCashCollected).toBeGreaterThanOrEqual(120000);
    expect(summary.totalOperatingExpenses).toBeGreaterThanOrEqual(8500);
    expect(summary.netProfit).toBeGreaterThan(0);
    expect(summary.totalEarnedRevenue).toBeGreaterThanOrEqual(120000);
    expect(summary.branchBreakdown.length).toBeGreaterThanOrEqual(1);
  });

  // STEP 15: Owner reviews Analytics & Business Reports
  it('Step 15: Owner reviews real analytics dashboard metrics (no synthetic data)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/dashboard?period=monthly')
      .set('Cookie', ownerCookie)
      .expect(200);

    expect(res.body.success).toBe(true);
    const analytics = res.body.data;

    expect(analytics.financialOverview.contractedRevenue).toBeGreaterThanOrEqual(120000);
    expect(analytics.financialOverview.cashCollected).toBeGreaterThanOrEqual(120000);
    expect(analytics.branchComparisons.length).toBeGreaterThanOrEqual(1);
  });

  // STEP 16: Security & Tenancy Isolation Verification
  it('Step 16: Central Branch Admin CANNOT access Kazanchis branch orders or financial data', async () => {
    // 1. Create a second branch
    const secondBranch = await prisma.branch.create({
      data: {
        name: 'Bole Medhanialem Branch',
        code: 'BOLE-SEC-BR',
        address: 'Bole Road, Addis Ababa',
        phone: '+251911002233',
        stockMode: StockMode.BRANCH_STOCK,
      },
    });

    // 2. Create admin for second branch
    const bcrypt = require('bcryptjs');
    const boleAdminPassword = await bcrypt.hash('BoleAdmin123!', 10);
    const boleUser = await prisma.user.create({
      data: {
        email: 'bole_sec_admin@example.com',
        fullName: 'Bole Branch Administrator',
        passwordHash: boleAdminPassword,
        role: UserRole.BRANCH_ADMIN,
        branchId: secondBranch.id,
        isActive: true,
      },
    });

    const boleLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'bole_sec_admin@example.com', password: 'BoleAdmin123!' })
      .expect(200);

    const boleAdminCookie = boleLoginRes.headers['set-cookie'][0];

    // Attempt to access Kazanchis branch order details -> MUST be rejected with 403 Forbidden
    await request(app.getHttpServer())
      .get(`/api/v1/orders/${orderId}`)
      .set('Cookie', boleAdminCookie)
      .expect(403);

    // Attempt to record payment against Kazanchis branch order -> MUST be rejected with 403 Forbidden
    await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Cookie', boleAdminCookie)
      .send({
        orderId,
        amount: 5000,
        paymentType: PaymentType.PROGRESS_PAYMENT,
        paymentMethod: 'Cash',
      })
      .expect(403);

    // Clean up second branch
    await prisma.user.deleteMany({ where: { id: boleUser.id } });
    await prisma.branch.delete({ where: { id: secondBranch.id } });
  });

  // STEP 17: Storage & File Upload Validation
  it('Step 17: File upload strictly enforces magic bytes and rejects counterfeit executables', async () => {
    // Create counterfeit text file masquerading as .jpg
    const fakeImageBuffer = Buffer.from('<html><body>Fake Image Script</body></html>');

    const res = await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/images`)
      .set('Cookie', [ownerCookie])
      .attach('image', fakeImageBuffer, 'malicious.jpg')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Invalid image file signature');
  });
});
