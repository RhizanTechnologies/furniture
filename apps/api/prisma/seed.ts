import { PrismaClient, UserRole, StockMode } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding baseline order stages...');

  const baselineStages = [
    { name: 'Deposit Received', color: '#16A34A', sequenceOrder: 1, isFinalStage: false },
    { name: 'Timber & Material Preparation', color: '#CA8A04', sequenceOrder: 2, isFinalStage: false },
    { name: 'Carpentry & Framing', color: '#D97706', sequenceOrder: 3, isFinalStage: false },
    { name: 'Upholstery & Assembly', color: '#EA580C', sequenceOrder: 4, isFinalStage: false },
    { name: 'Finishing & Polishing', color: '#9333EA', sequenceOrder: 5, isFinalStage: false },
    { name: 'Ready for Showroom / Pickup', color: '#2563EB', sequenceOrder: 6, isFinalStage: false },
    { name: 'Delivered & Fulfilled', color: '#059669', sequenceOrder: 7, isFinalStage: true },
  ];

  for (const stage of baselineStages) {
    await prisma.orderStage.upsert({
      where: { name: stage.name },
      update: {},
      create: stage,
    });
  }

  console.log('Baseline order stages ready.');

  console.log('Seeding Business Owner...');
  const ownerPasswordHash = await bcrypt.hash('Owner@123456', 10);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@furniture.com' },
    update: {
      passwordHash: ownerPasswordHash,
      role: UserRole.OWNER,
    },
    create: {
      email: 'owner@furniture.com',
      passwordHash: ownerPasswordHash,
      fullName: 'Abebe Kebede (Owner)',
      phone: '+251911000001',
      role: UserRole.OWNER,
      isActive: true,
    },
  });
  console.log(`Business Owner seeded: ${owner.email}`);

  console.log('Seeding initial branches and branch administrators...');

  // 1. Central Workshop (MAIN_STOCK)
  const centralBranch = await prisma.branch.upsert({
    where: { code: 'BR-MAIN' },
    update: {
      stockMode: StockMode.MAIN_STOCK,
    },
    create: {
      name: 'Main Central Workshop & Showroom',
      code: 'BR-MAIN',
      address: 'Kality Industrial Zone, Addis Ababa',
      phone: '+251114340001',
      stockMode: StockMode.MAIN_STOCK,
      isActive: true,
    },
  });

  const centralAdminPassword = await bcrypt.hash('Admin@123456', 10);
  await prisma.user.upsert({
    where: { email: 'admin.central@furniture.com' },
    update: {
      branchId: centralBranch.id,
      passwordHash: centralAdminPassword,
      role: UserRole.BRANCH_ADMIN,
    },
    create: {
      email: 'admin.central@furniture.com',
      passwordHash: centralAdminPassword,
      fullName: 'Yonas Alemu (Central Admin)',
      phone: '+251911223344',
      role: UserRole.BRANCH_ADMIN,
      branchId: centralBranch.id,
      isActive: true,
    },
  });

  // 2. Bole Branch (BRANCH_STOCK)
  const boleBranch = await prisma.branch.upsert({
    where: { code: 'BR-BOLE' },
    update: {
      stockMode: StockMode.BRANCH_STOCK,
    },
    create: {
      name: 'Bole Premium Showroom',
      code: 'BR-BOLE',
      address: 'Bole Medhanialem, Next to Edna Mall, Addis Ababa',
      phone: '+251116620002',
      stockMode: StockMode.BRANCH_STOCK,
      isActive: true,
    },
  });

  const boleAdminPassword = await bcrypt.hash('Admin@123456', 10);
  await prisma.user.upsert({
    where: { email: 'admin.bole@furniture.com' },
    update: {
      branchId: boleBranch.id,
      passwordHash: boleAdminPassword,
      role: UserRole.BRANCH_ADMIN,
    },
    create: {
      email: 'admin.bole@furniture.com',
      passwordHash: boleAdminPassword,
      fullName: 'Selamawit Desta (Bole Admin)',
      phone: '+251922556677',
      role: UserRole.BRANCH_ADMIN,
      branchId: boleBranch.id,
      isActive: true,
    },
  });

  console.log('Seed completed successfully with Owner, Branches and Branch Administrators.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
