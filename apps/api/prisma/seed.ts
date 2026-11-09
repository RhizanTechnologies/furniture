import { PrismaClient } from '@prisma/client';

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

  console.log('Baseline order stages successfully seeded.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
