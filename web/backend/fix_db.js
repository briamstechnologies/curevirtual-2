const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting DB fixes...');

  // Bug 1: Family Health Plan (Annual)
  const p1 = await prisma.subscriptionPlan.updateMany({
    where: {
      name: 'Family Health Plan (Annual)',
      module: 'patient'
    },
    data: {
      priceGHS: 408,
      priceUSD: 26.32
    }
  });
  console.log('Bug 1 updated:', p1.count, 'rows');

  // Bug 2: Family Health Plan (Monthly)
  const p2 = await prisma.subscriptionPlan.updateMany({
    where: {
      name: 'Family Health Plan (Monthly)',
      module: 'patient'
    },
    data: {
      priceGHS: 40,
      priceUSD: 2.58
    }
  });
  console.log('Bug 2 updated:', p2.count, 'rows');

  // Bug 3: Doctor Pro Plan (Annual)
  const p3 = await prisma.subscriptionPlan.updateMany({
    where: {
      name: 'Doctor Pro Plan (Annual)',
      module: 'doctor'
    },
    data: {
      commissionRateOverride: 8
    }
  });
  console.log('Bug 3 updated:', p3.count, 'rows');

  // Query all to confirm
  const allPlans = await prisma.subscriptionPlan.findMany();
  console.log('\n--- All Subscription Plans ---');
  allPlans.forEach(p => {
    console.log(`${p.name} [${p.module}]: priceGHS=${p.priceGHS}, priceUSD=${p.priceUSD}, override=${p.commissionRateOverride}`);
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
