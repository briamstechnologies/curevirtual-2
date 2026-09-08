const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanPerks() {
  const plans = await prisma.subscriptionPlan.findMany();
  for (const plan of plans) {
    let perks = plan.perks || {};
    let updated = false;

    // Doctor cleanup
    if (plan.module === 'doctor' && perks.advancedAnalytics) {
      delete perks.advancedAnalytics;
      updated = true;
    }

    // Lab/Pharmacy cleanup
    if (perks.priorityOrderRouting) {
      delete perks.priorityOrderRouting;
      updated = true;
    }
    if (perks.labAnalyticsDashboard) {
      delete perks.labAnalyticsDashboard;
      updated = true;
    }
    if (perks.pharmacyAnalyticsDashboard) {
      delete perks.pharmacyAnalyticsDashboard;
      updated = true;
    }

    if (updated) {
      await prisma.subscriptionPlan.update({
        where: { id: plan.id },
        data: { perks }
      });
      console.log(`Cleaned up keys for ${plan.name}`);
    }
  }
}

cleanPerks().then(() => prisma.$disconnect()).catch(console.error);
