import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import cookieParser = require('cookie-parser');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Inventory, Raw Materials & Product Costing (E2E) - Prompt 6', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let centralAdminCookie: string;
  let boleAdminCookie: string;

  let centralOrderId: string;
  let boleOrderId: string;
  let testMaterialId: string;

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

    // 2. Authenticate Central Admin (MAIN_STOCK)
    const centralRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin.central@furniture.com', password: 'Admin@123456' })
      .expect(200);
    centralAdminCookie = centralRes.headers['set-cookie'];

    // 3. Authenticate Bole Admin (BRANCH_STOCK)
    const boleRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin.bole@furniture.com', password: 'Admin@123456' })
      .expect(200);
    boleAdminCookie = boleRes.headers['set-cookie'];

    // Fetch branches
    const centralBranch = await prisma.branch.findUnique({ where: { code: 'BR-MAIN' } });
    const boleBranch = await prisma.branch.findUnique({ where: { code: 'BR-BOLE' } });

    // Create a customer & order in Central branch
    const centralCustomer = await prisma.customer.create({
      data: {
        fullName: 'Central Test Customer',
        phone: '+251911999881',
        branchId: centralBranch!.id,
      },
    });

    // Fetch first stage
    const initialStage = await prisma.orderStage.findFirst({
      orderBy: { sequenceOrder: 'asc' },
    });

    const centralOrder = await prisma.order.create({
      data: {
        orderNumber: 'ORD-INV-TEST-001',
        customer: { connect: { id: centralCustomer.id } },
        branch: { connect: { id: centralBranch!.id } },
        currentStage: { connect: { id: initialStage!.id } },
        totalAgreedPrice: 50000.0,
        totalPaid: 20000.0,
        outstandingBalance: 30000.0,
        deadlineDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      },
    });
    centralOrderId = centralOrder.id;

    // Create a customer & order in Bole branch
    const boleCustomer = await prisma.customer.create({
      data: {
        fullName: 'Bole Test Customer',
        phone: '+251911999882',
        branch: { connect: { id: boleBranch!.id } },
      },
    });

    const boleOrder = await prisma.order.create({
      data: {
        orderNumber: 'ORD-INV-TEST-002',
        customer: { connect: { id: boleCustomer.id } },
        branch: { connect: { id: boleBranch!.id } },
        currentStage: { connect: { id: initialStage!.id } },
        totalAgreedPrice: 60000.0,
        totalPaid: 25000.0,
        outstandingBalance: 35000.0,
        deadlineDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      },
    });
    boleOrderId = boleOrder.id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (centralOrderId) {
      await prisma.materialConsumption.deleteMany({ where: { orderId: centralOrderId } });
      await prisma.order.deleteMany({ where: { id: centralOrderId } });
    }
    if (boleOrderId) {
      await prisma.materialConsumption.deleteMany({ where: { orderId: boleOrderId } });
      await prisma.order.deleteMany({ where: { id: boleOrderId } });
    }
    if (testMaterialId) {
      await prisma.materialStockIn.deleteMany({ where: { rawMaterialId: testMaterialId } });
      await prisma.materialConsumption.deleteMany({ where: { rawMaterialId: testMaterialId } });
      await prisma.rawMaterial.deleteMany({ where: { id: testMaterialId } });
    }
    await prisma.customer.deleteMany({ where: { phone: { in: ['+251911999881', '+251911999882'] } } });

    await app.close();
  });

  it('1. GET /api/v1/inventory/materials - lists seeded raw materials with WAC unit costs', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/inventory/materials')
      .set('Cookie', ownerCookie)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(6);

    const wanza = res.body.data.find((m: any) => m.code === 'MAT-WNZ-001');
    expect(wanza).toBeDefined();
    expect(wanza.name).toContain('Wanza');
    expect(wanza.unitOfMeasurement).toBe('Meter');
    expect(wanza.currentStockQuantity).toBeGreaterThanOrEqual(100);
    expect(wanza.currentUnitCost).toBe(450.0);
    expect(wanza.stockValue).toBe(wanza.currentStockQuantity * 450.0);
  });

  it('2. POST /api/v1/inventory/materials - Owner creates new raw material; non-owner is blocked (403)', async () => {
    // Non-owner (central admin) cannot create raw material
    await request(app.getHttpServer())
      .post('/api/v1/inventory/materials')
      .set('Cookie', centralAdminCookie)
      .send({
        code: 'MAT-TEST-OAK',
        name: 'Kiln-Dried White Oak Timber',
        category: 'Timber',
        unitOfMeasurement: 'Meter',
        initialStockQuantity: 100.0,
        initialUnitCost: 400.0,
        reorderAlertQuantity: 15.0,
      })
      .expect(403);

    // Owner creates raw material
    const res = await request(app.getHttpServer())
      .post('/api/v1/inventory/materials')
      .set('Cookie', ownerCookie)
      .send({
        code: 'MAT-TEST-OAK',
        name: 'Kiln-Dried White Oak Timber',
        category: 'Timber',
        unitOfMeasurement: 'Meter',
        initialStockQuantity: 100.0,
        initialUnitCost: 400.0,
        reorderAlertQuantity: 15.0,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('MAT-TEST-OAK');
    expect(res.body.data.currentStockQuantity).toBe(100.0);
    expect(res.body.data.currentUnitCost).toBe(400.0);
    expect(res.body.data.stockValue).toBe(40000.0);

    testMaterialId = res.body.data.id;
  });

  it('3. POST /api/v1/inventory/stock-in - correctly recalculates Weighted Average Cost (WAC) dynamically', async () => {
    // Current stock: 100 meters @ 400 ETB = 40,000 ETB
    // Incoming replenishment: 50 meters @ 700 ETB = 35,000 ETB
    // Expected combined value: 75,000 ETB
    // Expected total quantity: 150 meters
    // Expected new WAC: 75,000 / 150 = 500.00 ETB
    const res = await request(app.getHttpServer())
      .post('/api/v1/inventory/stock-in')
      .set('Cookie', ownerCookie)
      .send({
        rawMaterialId: testMaterialId,
        receivedQuantity: 50.0,
        unitCost: 700.0,
        supplierInvoiceRef: 'INV-TEST-BATCH-002',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.receivedQuantity).toBe(50.0);
    expect(res.body.data.unitCost).toBe(700.0);
    expect(res.body.data.totalCost).toBe(35000.0);

    // Verify material stock and new WAC
    const matRes = await request(app.getHttpServer())
      .get(`/api/v1/inventory/materials/${testMaterialId}`)
      .set('Cookie', ownerCookie)
      .expect(200);

    expect(matRes.body.data.currentStockQuantity).toBe(150.0);
    expect(matRes.body.data.currentUnitCost).toBe(500.0);
    expect(matRes.body.data.stockValue).toBe(75000.0);
  });

  it('4. POST /api/v1/inventory/consumption - records consumption, freezes allocated WAC, and deducts inventory', async () => {
    // Before consumption: 150 meters @ 500 ETB
    // Consume 10 meters for Central Order
    const res = await request(app.getHttpServer())
      .post('/api/v1/inventory/consumption')
      .set('Cookie', centralAdminCookie)
      .send({
        orderId: centralOrderId,
        rawMaterialId: testMaterialId,
        consumedQuantity: 10.0,
        notes: 'Main frame carpentry construction',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.consumedQuantity).toBe(10.0);
    expect(res.body.data.unitCostAllocated).toBe(500.0);
    expect(res.body.data.totalMaterialCost).toBe(5000.0);

    // Verify inventory reduced to 140 meters
    const matRes = await request(app.getHttpServer())
      .get(`/api/v1/inventory/materials/${testMaterialId}`)
      .set('Cookie', ownerCookie)
      .expect(200);

    expect(matRes.body.data.currentStockQuantity).toBe(140.0);
    expect(matRes.body.data.currentUnitCost).toBe(500.0);
    expect(matRes.body.data.stockValue).toBe(70000.0);
  });

  it('5. POST /api/v1/inventory/consumption - accurately performs unit conversion (cm -> m)', async () => {
    // Current stock: 140 meters
    // Consume 500 centimeters = 5.0 meters
    const res = await request(app.getHttpServer())
      .post('/api/v1/inventory/consumption')
      .set('Cookie', centralAdminCookie)
      .send({
        orderId: centralOrderId,
        rawMaterialId: testMaterialId,
        consumedQuantity: 500.0,
        unit: 'centimeter',
        notes: 'Table cross-beams',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.consumedQuantity).toBe(5.0); // Converted to meters
    expect(res.body.data.unitCostAllocated).toBe(500.0);
    expect(res.body.data.totalMaterialCost).toBe(2500.0);

    // Verify inventory reduced by 5 meters: 140 - 5 = 135 meters
    const matRes = await request(app.getHttpServer())
      .get(`/api/v1/inventory/materials/${testMaterialId}`)
      .set('Cookie', ownerCookie)
      .expect(200);

    expect(matRes.body.data.currentStockQuantity).toBe(135.0);
  });

  it('6. POST /api/v1/inventory/consumption - rejects negative inventory and incompatible unit conversions', async () => {
    // 1. Trying to consume 9999 meters (available: 135) must be rejected with 400
    const overRes = await request(app.getHttpServer())
      .post('/api/v1/inventory/consumption')
      .set('Cookie', centralAdminCookie)
      .send({
        orderId: centralOrderId,
        rawMaterialId: testMaterialId,
        consumedQuantity: 9999.0,
      })
      .expect(400);

    expect(overRes.body.message).toContain('Insufficient inventory');

    // 2. Trying to consume length material with volume unit (e.g. Liter) must be rejected with 400
    const unitRes = await request(app.getHttpServer())
      .post('/api/v1/inventory/consumption')
      .set('Cookie', centralAdminCookie)
      .send({
        orderId: centralOrderId,
        rawMaterialId: testMaterialId,
        consumedQuantity: 10.0,
        unit: 'liter',
      })
      .expect(400);

    expect(unitRes.body.message).toContain('Incompatible measurement units');
  });

  it("7. Tenancy Authorization - Branch Admin cannot consume materials for another branch's order (403)", async () => {
    // Bole branch admin tries to consume materials for Central branch's order
    await request(app.getHttpServer())
      .post('/api/v1/inventory/consumption')
      .set('Cookie', boleAdminCookie)
      .send({
        orderId: centralOrderId,
        rawMaterialId: testMaterialId,
        consumedQuantity: 1.0,
      })
      .expect(403);
  });

  it('8. GET /api/v1/inventory/orders/:orderId/costing - returns material cost breakdown, gross profit and margin', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/inventory/orders/${centralOrderId}/costing`)
      .set('Cookie', centralAdminCookie)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.orderId).toBe(centralOrderId);
    expect(res.body.data.totalAgreedPrice).toBe(50000.0);

    // We recorded 2 consumptions: 5000 ETB (10m) + 2500 ETB (5m) = 7500 ETB
    expect(res.body.data.totalMaterialCost).toBe(7500.0);
    expect(res.body.data.grossProfit).toBe(42500.0); // 50000 - 7500
    expect(res.body.data.grossMarginPercentage).toBe(85.0); // (42500 / 50000) * 100
    expect(res.body.data.consumptions.length).toBe(2);
  });

  it('9. Historical Cost Preservation - New stock-in at higher price does NOT alter past order consumption costs', async () => {
    // Current stock: 135 meters @ 500 ETB
    // Record new stock-in of 65 meters at a huge price spike: 1000 ETB/meter
    await request(app.getHttpServer())
      .post('/api/v1/inventory/stock-in')
      .set('Cookie', ownerCookie)
      .send({
        rawMaterialId: testMaterialId,
        receivedQuantity: 65.0,
        unitCost: 1000.0,
      })
      .expect(201);

    // Verify new stock-in increased the current WAC
    const matRes = await request(app.getHttpServer())
      .get(`/api/v1/inventory/materials/${testMaterialId}`)
      .set('Cookie', ownerCookie)
      .expect(200);

    expect(matRes.body.data.currentUnitCost).toBeGreaterThan(500.0); // New WAC is ~662.50 ETB

    // Past order costing MUST remain frozen at 7500 ETB (not recalculated at new 662.50 ETB WAC)
    const costRes = await request(app.getHttpServer())
      .get(`/api/v1/inventory/orders/${centralOrderId}/costing`)
      .set('Cookie', centralAdminCookie)
      .expect(200);

    expect(costRes.body.data.totalMaterialCost).toBe(7500.0);
    expect(costRes.body.data.grossProfit).toBe(42500.0);
  });

  it('10. GET /api/v1/inventory/valuation - returns accurate total remaining stock valuation and category totals', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/inventory/valuation')
      .set('Cookie', ownerCookie)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.totalStockValue).toBeGreaterThan(0);
    expect(res.body.data.totalItemsInStock).toBeGreaterThanOrEqual(6);
    expect(Array.isArray(res.body.data.categories)).toBe(true);

    const timberCategory = res.body.data.categories.find((c: any) => c.category === 'Timber');
    expect(timberCategory).toBeDefined();
    expect(timberCategory.totalStockValue).toBeGreaterThan(0);
    expect(timberCategory.totalQuantity).toBeGreaterThan(0);
  });
});
