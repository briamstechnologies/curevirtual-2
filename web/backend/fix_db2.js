const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fixing USD prices based on 15.5 FX rate...');

  const updates = [
    { name: 'Doctor Pro Plan (Monthly)', module: 'doctor', ghs: 100, usd: 6.45 },
    { name: 'Lab Partner Plan (Monthly)', module: 'laboratory', ghs: 150, usd: 9.68 },
    { name: 'Doctor Pro Plan (Annual)', module: 'doctor', ghs: 1000, usd: 64.52 },
    { name: 'Lab Partner Plan (Annual)', module: 'laboratory', ghs: 1500, usd: 96.77 },
    { name: 'Pharmacy Partner Plan (Annual)', module: 'pharmacy', ghs: 1500, usd: 96.77 },
    { name: 'Pharmacy Partner Plan (Monthly)', module: 'pharmacy', ghs: 150, usd: 9.68 },
  ];

  for (const u of updates) {
    const res = await prisma.subscriptionPlan.updateMany({
      where: { name: u.name, module: u.module },
      data: { priceUSD: u.usd } // ONLY update USD, do not touch GHS
    });
    console.log(`Updated ${u.name} [${u.module}] -> USD ${u.usd} (${res.count} rows)`);
  }

  // Verify
  console.log('\n--- VERIFICATION ---');
  const allPlans = await prisma.subscriptionPlan.findMany();
  allPlans.forEach(p => {
    const impliedRate = (p.priceGHS / p.priceUSD).toFixed(2);
    console.log(`${p.name} [${p.module}]: priceGHS=${p.priceGHS}, priceUSD=${p.priceUSD} (Implied Rate: ${impliedRate})`);
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
