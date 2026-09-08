const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showPerks() {
  const plans = await prisma.subscriptionPlan.findMany();
  for (const p of plans) {
    console.log(`[${p.module}] ${p.name}:`);
    console.log(JSON.stringify(p.perks, null, 2));
    console.log("------------------------");
  }
}

showPerks().then(() => prisma.$disconnect()).catch(console.error);
