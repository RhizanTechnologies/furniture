const { PrismaClient } = require('../node_modules/@prisma/client');

const local = new PrismaClient({
  datasourceUrl: 'postgresql://furniture_user:furniture_pass@localhost:5436/furniture_erp?schema=public'
});

const neon = new PrismaClient({
  datasourceUrl: 'postgresql://neondb_owner:npg_KrRe7y3WgoaI@ep-bold-sky-adfo04bj-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function syncAll() {
  console.log('--- Starting complete migration from Local DB to Neon Cloud DB ---');

  // 1. Truncate all tables in Neon
  console.log('Cleaning up Neon tables...');
  await neon.$executeRawUnsafe(`
    TRUNCATE TABLE 
      "_BranchToProduct",
      "material_consumptions",
      "material_stock_ins",
      "expenses",
      "payments",
      "order_stage_histories",
      "order_items",
      "orders",
      "product_images",
      "products",
      "raw_materials",
      "customers",
      "order_stages",
      "idempotency_records",
      "users",
      "branches"
    CASCADE;
  `);

  // 2. Branches
  const branches = await local.branch.findMany();
  console.log(`Migrating ${branches.length} branches (including Betel)...`);
  if (branches.length > 0) {
    await neon.branch.createMany({ data: branches });
  }

  // 3. Users
  const users = await local.user.findMany();
  console.log(`Migrating ${users.length} users (including nebiyumusbah378@gmail.com)...`);
  if (users.length > 0) {
    await neon.user.createMany({ data: users });
  }

  // 4. Order Stages
  const orderStages = await local.orderStage.findMany();
  console.log(`Migrating ${orderStages.length} order stages...`);
  if (orderStages.length > 0) {
    await neon.orderStage.createMany({ data: orderStages });
  }

  // 5. Customers
  const customers = await local.customer.findMany();
  console.log(`Migrating ${customers.length} customers (including Sol)...`);
  if (customers.length > 0) {
    await neon.customer.createMany({ data: customers });
  }

  // 6. Products
  const products = await local.product.findMany();
  console.log(`Migrating ${products.length} products...`);
  if (products.length > 0) {
    await neon.product.createMany({ data: products });
  }

  // 7. Product Images
  const productImages = await local.productImage.findMany();
  console.log(`Migrating ${productImages.length} product images...`);
  if (productImages.length > 0) {
    await neon.productImage.createMany({ data: productImages });
  }

  // 8. Product to Branch relations
  try {
    const branchProducts = await local.$queryRawUnsafe('SELECT * FROM "_BranchToProduct";');
    console.log(`Migrating ${branchProducts.length} product-to-branch links...`);
    for (const bp of branchProducts) {
      await neon.$executeRawUnsafe(
        'INSERT INTO "_BranchToProduct" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING;',
        bp.A,
        bp.B
      );
    }
  } catch (err) {
    console.warn('Note on _BranchToProduct:', err.message);
  }

  // 9. Raw Materials
  const rawMaterials = await local.rawMaterial.findMany();
  console.log(`Migrating ${rawMaterials.length} raw materials...`);
  if (rawMaterials.length > 0) {
    await neon.rawMaterial.createMany({ data: rawMaterials });
  }

  // 10. Orders
  const orders = await local.order.findMany();
  console.log(`Migrating ${orders.length} orders (including ORD-2026-00001)...`);
  if (orders.length > 0) {
    await neon.order.createMany({ data: orders });
  }

  // 11. Order Items
  const orderItems = await local.orderItem.findMany();
  console.log(`Migrating ${orderItems.length} order items...`);
  if (orderItems.length > 0) {
    await neon.orderItem.createMany({ data: orderItems });
  }

  // 12. Order Stage History
  const stageHistories = await local.orderStageHistory.findMany();
  console.log(`Migrating ${stageHistories.length} stage histories...`);
  if (stageHistories.length > 0) {
    await neon.orderStageHistory.createMany({ data: stageHistories });
  }

  // 13. Payments
  const payments = await local.payment.findMany();
  console.log(`Migrating ${payments.length} payment records...`);
  if (payments.length > 0) {
    await neon.payment.createMany({ data: payments });
  }

  // 14. Expenses
  const expenses = await local.expense.findMany();
  console.log(`Migrating ${expenses.length} expense records...`);
  if (expenses.length > 0) {
    await neon.expense.createMany({ data: expenses });
  }

  // 15. Stock Ins
  const stockIns = await local.materialStockIn.findMany();
  console.log(`Migrating ${stockIns.length} stock replenishment records...`);
  if (stockIns.length > 0) {
    await neon.materialStockIn.createMany({ data: stockIns });
  }

  // 16. Material Consumptions
  const consumptions = await local.materialConsumption.findMany();
  console.log(`Migrating ${consumptions.length} material consumptions...`);
  if (consumptions.length > 0) {
    await neon.materialConsumption.createMany({ data: consumptions });
  }

  console.log('\n--- VERIFICATION OF NEON CLOUD DATABASE ---');
  const neonUsers = await neon.user.findMany({ select: { email: true, fullName: true, role: true } });
  console.log('Neon Users:', neonUsers);

  const neonBranches = await neon.branch.findMany({ select: { name: true, code: true } });
  console.log('Neon Branches:', neonBranches);

  const neonOrders = await neon.order.findMany({ select: { orderNumber: true, totalAgreedPrice: true } });
  console.log('Neon Orders:', neonOrders);

  const neonCustomers = await neon.customer.findMany({ select: { fullName: true, phone: true } });
  console.log('Neon Customers:', neonCustomers);

  console.log('--- Migration Completed Successfully! ---');
}

syncAll()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await local.$disconnect();
    await neon.$disconnect();
  });
