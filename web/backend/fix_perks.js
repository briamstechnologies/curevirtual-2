const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updatePerks() {
  console.log("Updating Perks for Doctor...");
  
  // Doctor Plans
  let docPlans = await prisma.subscriptionPlan.findMany({ where: { module: 'doctor' } });
  for (let plan of docPlans) {
    let perks = plan.perks || {};
    perks.priorityListing = true;
    perks.analytics = true;
    await prisma.subscriptionPlan.update({
      where: { id: plan.id },
      data: { perks }
    });
  }

  // Lab Plans
  let labPlans = await prisma.subscriptionPlan.findMany({ where: { module: 'laboratory' } });
  for (let plan of labPlans) {
    let perks = plan.perks || {};
    perks.dashboardAccess = true;
    perks.inventorySync = true;
    perks.priorityPlacement = true;
    await prisma.subscriptionPlan.update({
      where: { id: plan.id },
      data: { perks }
    });
  }

  // Pharmacy Plans
  let pharmPlans = await prisma.subscriptionPlan.findMany({ where: { module: 'pharmacy' } });
  for (let plan of pharmPlans) {
    let perks = plan.perks || {};
    perks.shelfPlacement = true;
    perks.inventorySync = true;
    perks.deliveryIntegration = true;
    await prisma.subscriptionPlan.update({
      where: { id: plan.id },
      data: { perks }
    });
  }

  console.log("Perks updated successfully.");
}

updatePerks().then(() => prisma.$disconnect()).catch(console.error);
