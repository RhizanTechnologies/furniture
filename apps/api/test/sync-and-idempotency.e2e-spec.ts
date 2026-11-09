import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import cookieParser = require('cookie-parser');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { UserRole, PaymentType } from '@furniture/shared';

describe('Sync and Idempotency Engine (E2E) - Prompt 9', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let branchAdminCookie: string;
  let branchId: string;
  let orderStageId: string;
  let rawMaterialId: string;

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
    await app.init();

    prisma = app.get(PrismaService);

    // Clean up test data safely scoped to this test suite
    await prisma.idempotencyRecord.deleteMany({
      where: {
        idempotencyKey: {
          in: [
            '11111111-1111-4111-a111-111111111111',
            '22222222-2222-4222-a222-222222222222',
            '33333333-3333-4333-a333-333333333333',
            '44444444-4444-4444-a444-444444444444',
            '55555555-5555-4555-a555-555555555555',
            '66666666-6666-4666-a666-666666666666',
            '77777777-7777-4777-a777-777777777777',
          ],
        },
      },
    });

    const existingSyncCust = await prisma.customer.findFirst({ where: { phone: '+251911880011' } });
    if (existingSyncCust) {
      const ords = await prisma.order.findMany({ where: { customerId: existingSyncCust.id } });
      for (const ord of ords) {
        await prisma.materialConsumption.deleteMany({ where: { orderId: ord.id } });
        await prisma.payment.deleteMany({ where: { orderId: ord.id } });
        await prisma.orderItem.deleteMany({ where: { orderId: ord.id } });
        await prisma.orderStageHistory.deleteMany({ where: { orderId: ord.id } });
        await prisma.order.delete({ where: { id: ord.id } });
      }
      await prisma.customer.delete({ where: { id: existingSyncCust.id } });
    }

    await prisma.materialStockIn.deleteMany({ where: { rawMaterial: { code: 'SYNC-MAT-01' } } });
    await prisma.materialConsumption.deleteMany({ where: { rawMaterial: { code: 'SYNC-MAT-01' } } });
    await prisma.rawMaterial.deleteMany({ where: { code: 'SYNC-MAT-01' } });
    await prisma.user.deleteMany({ where: { email: { in: ['sync_owner@example.com', 'sync_admin@example.com'] } } });
    await prisma.branch.deleteMany({ where: { code: 'SYNC-BR' } });

    // Seed branch
    const branch = await prisma.branch.create({
      data: {
        name: 'Sync Test Branch',
        code: 'SYNC-BR',
        address: 'Bole Road, Addis Ababa',
        phone: '+251911998877',
      },
    });
    branchId = branch.id;

    // Seed Owner
    const bcrypt = require('bcryptjs');
    const ownerPassword = await bcrypt.hash('OwnerPassword123!', 10);
    const ownerUser = await prisma.user.create({
      data: {
        email: 'sync_owner@example.com',
        fullName: 'Sync System Owner',
        passwordHash: ownerPassword,
        role: UserRole.OWNER,
        isActive: true,
      },
    });

    // Seed Branch Admin
    const adminPassword = await bcrypt.hash('AdminPassword123!', 10);
    const adminUser = await prisma.user.create({
      data: {
        email: 'sync_admin@example.com',
        fullName: 'Sync Branch Admin',
        passwordHash: adminPassword,
        role: UserRole.BRANCH_ADMIN,
        branchId: branchId,
        isActive: true,
      },
    });

    // Seed Order Stage
    const stage = await prisma.orderStage.findFirst({ where: { isActive: true } });
    if (stage) {
      orderStageId = stage.id;
    } else {
      const createdStage = await prisma.orderStage.create({
        data: {
          name: 'Confirmed Deposit',
          color: '#3A2010',
          sequenceOrder: 1,
          isFinalStage: false,
          isActive: true,
        },
      });
      orderStageId = createdStage.id;
    }

    // Seed Raw Material with initial stock
    const material = await prisma.rawMaterial.create({
      data: {
        code: 'SYNC-MAT-01',
        name: 'Sync Premium Wanza Timber',
        category: 'Solid Hardwood',
        unitOfMeasurement: 'PCS',
        currentStockQuantity: 10,
        currentUnitCost: 2500,
        isActive: true,
      },
    });
    rawMaterialId = material.id;

    // Log in as Owner
    const ownerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'sync_owner@example.com', password: 'OwnerPassword123!' });
    ownerCookie = ownerRes.headers['set-cookie'][0];

    // Log in as Branch Admin
    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'sync_admin@example.com', password: 'AdminPassword123!' });
    branchAdminCookie = adminRes.headers['set-cookie'][0];
  });

  afterAll(async () => {
    await prisma.idempotencyRecord.deleteMany({
      where: {
        idempotencyKey: {
          in: [
            '11111111-1111-4111-a111-111111111111',
            '22222222-2222-4222-a222-222222222222',
            '33333333-3333-4333-a333-333333333333',
            '44444444-4444-4444-a444-444444444444',
            '55555555-5555-4555-a555-555555555555',
            '66666666-6666-4666-a666-666666666666',
            '77777777-7777-4777-a777-777777777777',
          ],
        },
      },
    });

    const existingSyncCust = await prisma.customer.findFirst({ where: { phone: '+251911880011' } });
    if (existingSyncCust) {
      const ords = await prisma.order.findMany({ where: { customerId: existingSyncCust.id } });
      for (const ord of ords) {
        await prisma.materialConsumption.deleteMany({ where: { orderId: ord.id } });
        await prisma.payment.deleteMany({ where: { orderId: ord.id } });
        await prisma.orderItem.deleteMany({ where: { orderId: ord.id } });
        await prisma.orderStageHistory.deleteMany({ where: { orderId: ord.id } });
        await prisma.order.delete({ where: { id: ord.id } });
      }
      await prisma.customer.delete({ where: { id: existingSyncCust.id } });
    }

    await prisma.materialStockIn.deleteMany({ where: { rawMaterial: { code: 'SYNC-MAT-01' } } });
    await prisma.materialConsumption.deleteMany({ where: { rawMaterial: { code: 'SYNC-MAT-01' } } });
    await prisma.rawMaterial.deleteMany({ where: { code: 'SYNC-MAT-01' } });
    await prisma.user.deleteMany({ where: { email: { in: ['sync_owner@example.com', 'sync_admin@example.com'] } } });
    await prisma.branch.deleteMany({ where: { code: 'SYNC-BR' } });
    await app.close();
  });

  it('GET /api/v1/sync/status - verifies server sync engine clock and readiness', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/sync/status')
      .set('Cookie', branchAdminCookie)
      .expect(200);

    expect(res.body.status).toBe('online');
    expect(res.body.serverTime).toBeDefined();
  });

  it('POST /api/v1/sync/batch - synchronizes offline customer, dependent order, and payment in causal sequence', async () => {
    const customerMutationId = '11111111-1111-4111-a111-111111111111';
    const orderMutationId = '22222222-2222-4222-a222-222222222222';
    const paymentMutationId = '33333333-3333-4333-a333-333333333333';
    const tempCustomerId = 'client-temp-cust-100';
    const tempOrderId = 'client-temp-ord-200';

    const batchPayload = {
      operations: [
        {
          clientMutationId: customerMutationId,
          entityType: 'CUSTOMER',
          action: 'CREATE',
          tempEntityId: tempCustomerId,
          payload: {
            fullName: 'Offline Created Customer',
            phone: '+251911880011',
            email: 'offline1@example.com',
            address: 'Bole Medhanialem',
          },
        },
        {
          clientMutationId: orderMutationId,
          entityType: 'ORDER',
          action: 'CREATE',
          tempEntityId: tempOrderId,
          payload: {
            customerId: tempCustomerId, // Uses temp client ID resolved by server
            items: [
              {
                itemDescription: 'Executive Wanza Office Desk',
                quantity: 1,
                unitPrice: 50000,
              },
            ],
            totalAgreedPrice: 50000,
            prepaymentAmount: 20000,
            deadlineDate: new Date(Date.now() + 10 * 86400000).toISOString(),
            currentStageId: orderStageId,
          },
        },
        {
          clientMutationId: paymentMutationId,
          entityType: 'PAYMENT',
          action: 'CREATE',
          payload: {
            orderId: tempOrderId, // Uses temp client ID resolved by server
            amount: 15000,
            paymentType: PaymentType.PROGRESS_PAYMENT,
            paymentMethod: 'Bank Transfer',
            referenceNumber: 'OFFLINE-TXN-9988',
          },
        },
      ],
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/sync/batch')
      .set('Cookie', branchAdminCookie)
      .send(batchPayload)
      .expect(200);

    expect(res.body.results).toHaveLength(3);

    const custResult = res.body.results[0];
    expect(custResult.clientMutationId).toBe(customerMutationId);
    expect(custResult.status).toBe('SUCCESS');
    expect(custResult.result.id).toBeDefined();

    const ordResult = res.body.results[1];
    expect(ordResult.clientMutationId).toBe(orderMutationId);
    expect(ordResult.status).toBe('SUCCESS');
    expect(ordResult.result.customerId).toBe(custResult.result.id);
    expect(Number(ordResult.result.totalAgreedPrice)).toBe(50000);

    const payResult = res.body.results[2];
    expect(payResult.clientMutationId).toBe(paymentMutationId);
    expect(payResult.status).toBe('SUCCESS');
    expect(Number(payResult.result.amount)).toBe(15000);
  });

  it('POST /api/v1/sync/batch - duplicate synchronization is strictly idempotent and does not double charge', async () => {
    const customerMutationId = '11111111-1111-4111-a111-111111111111';
    const orderMutationId = '22222222-2222-4222-a222-222222222222';
    const paymentMutationId = '33333333-3333-4333-a333-333333333333';

    // Submit EXACT same batch with identical clientMutationIds
    const duplicateBatch = {
      operations: [
        {
          clientMutationId: customerMutationId,
          entityType: 'CUSTOMER',
          action: 'CREATE',
          payload: { fullName: 'Offline Created Customer', phone: '+251911880011' },
        },
        {
          clientMutationId: paymentMutationId,
          entityType: 'PAYMENT',
          action: 'CREATE',
          payload: { amount: 15000 },
        },
      ],
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/sync/batch')
      .set('Cookie', branchAdminCookie)
      .send(duplicateBatch)
      .expect(200);

    expect(res.body.results).toHaveLength(2);
    expect(res.body.results[0].status).toBe('SUCCESS');
    expect(res.body.results[0].isDuplicate).toBe(true);
    expect(res.body.results[1].status).toBe('SUCCESS');
    expect(res.body.results[1].isDuplicate).toBe(true);

    // Verify in database that only ONE payment exists with this key
    const paymentCount = await prisma.payment.count({
      where: { idempotencyKey: paymentMutationId },
    });
    expect(paymentCount).toBe(1);
  });

  it('POST /api/v1/sync/batch - handles phone number conflict by returning canonical customer profile', async () => {
    const conflictMutationId = '44444444-4444-4444-a444-444444444444';

    // Try creating customer offline with a phone number that already exists
    const batch = {
      operations: [
        {
          clientMutationId: conflictMutationId,
          entityType: 'CUSTOMER',
          action: 'CREATE',
          payload: {
            fullName: 'Duplicate Phone Contact',
            phone: '+251911880011', // same phone as existing customer
          },
        },
      ],
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/sync/batch')
      .set('Cookie', branchAdminCookie)
      .send(batch)
      .expect(200);

    expect(res.body.results).toHaveLength(1);
    const result = res.body.results[0];
    expect(result.status).toBe('SUCCESS');
    expect(result.result.syncedNote).toBe('MERGED_EXISTING_CUSTOMER');
    expect(result.result.phone).toBe('+251911880011');
  });

  it('POST /api/v1/sync/batch - returns CONFLICT on overpayment and does not corrupt account ledger', async () => {
    // First, find the order created previously
    const existingOrder = await prisma.order.findFirst({
      where: { customer: { phone: '+251911880011' } },
    });
    expect(existingOrder).toBeDefined();

    const overpaymentMutationId = '55555555-5555-4555-a555-555555555555';
    // Remaining balance on 50000 total with 20000 initial + 15000 progress is 15000.
    // An offline payment of 30000 exceeds remaining balance.
    const batch = {
      operations: [
        {
          clientMutationId: overpaymentMutationId,
          entityType: 'PAYMENT',
          action: 'CREATE',
          payload: {
            orderId: existingOrder!.id,
            amount: 30000,
            paymentType: PaymentType.FINAL_SETTLEMENT,
            paymentMethod: 'Cash',
          },
        },
      ],
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/sync/batch')
      .set('Cookie', branchAdminCookie)
      .send(batch)
      .expect(200);

    expect(res.body.results).toHaveLength(1);
    const result = res.body.results[0];
    expect(result.status).toBe('CONFLICT');
    expect(result.conflictType).toBe('OVERPAYMENT_REJECTED');
    expect(result.conflictDetails.outstandingBalance).toBe(15000);
    expect(result.conflictDetails.attemptedAmount).toBe(30000);
  });

  it('POST /api/v1/sync/batch - returns CONFLICT on material consumption if stock is insufficient', async () => {
    const existingOrder = await prisma.order.findFirst({
      where: { customer: { phone: '+251911880011' } },
    });
    expect(existingOrder).toBeDefined();

    const stockConflictMutationId = '66666666-6666-4666-a666-666666666666';
    // Available stock in raw material is 10 PCS. Requesting 50 PCS must trigger conflict.
    const batch = {
      operations: [
        {
          clientMutationId: stockConflictMutationId,
          entityType: 'MATERIAL_CONSUMPTION',
          action: 'CONSUME',
          payload: {
            orderId: existingOrder!.id,
            rawMaterialId: rawMaterialId,
            consumedQuantity: 50,
          },
        },
      ],
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/sync/batch')
      .set('Cookie', branchAdminCookie)
      .send(batch)
      .expect(200);

    expect(res.body.results).toHaveLength(1);
    const result = res.body.results[0];
    expect(result.status).toBe('CONFLICT');
    expect(result.conflictType).toBe('INSUFFICIENT_STOCK');
    expect(result.conflictDetails.availableStock).toBe(10);
    expect(result.conflictDetails.requestedQuantity).toBe(50);

    // Verify database stock was NOT modified or corrupted
    const mat = await prisma.rawMaterial.findUnique({ where: { id: rawMaterialId } });
    expect(Number(mat!.currentStockQuantity)).toBe(10);
  });

  it('POST /api/v1/sync/batch - successfully consumes stock when quantity is available', async () => {
    const existingOrder = await prisma.order.findFirst({
      where: { customer: { phone: '+251911880011' } },
    });
    expect(existingOrder).toBeDefined();

    const validConsumptionMutationId = '77777777-7777-4777-a777-777777777777';
    // Consuming 3 PCS out of 10 PCS
    const batch = {
      operations: [
        {
          clientMutationId: validConsumptionMutationId,
          entityType: 'MATERIAL_CONSUMPTION',
          action: 'CONSUME',
          payload: {
            orderId: existingOrder!.id,
            rawMaterialId: rawMaterialId,
            consumedQuantity: 3,
          },
        },
      ],
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/sync/batch')
      .set('Cookie', branchAdminCookie)
      .send(batch)
      .expect(200);

    expect(res.body.results).toHaveLength(1);
    const result = res.body.results[0];
    expect(result.status).toBe('SUCCESS');
    expect(Number(result.result.consumedQuantity)).toBe(3);

    // Stock should now be 7 PCS
    const mat = await prisma.rawMaterial.findUnique({ where: { id: rawMaterialId } });
    expect(Number(mat!.currentStockQuantity)).toBe(7);
  });
});
