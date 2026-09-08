const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log("=== Subscription Plans ===");
  const plans = await prisma.subscriptionPlan.findMany();
  console.table(plans.map(p => ({
    id: p.id,
    module: p.module,
    name: p.name,
    billingCycle: p.billingCycle,
    priceGHS: p.priceGHS,
    priceUSD: p.priceUSD,
    commissionOverride: p.commissionRateOverride
  })));

  console.log("\n=== Platform Fee Configs (Active) ===");
  const fees = await prisma.platformFeeConfig.findMany({
    where: { effectiveTo: null }
  });
  console.table(fees.map(f => ({
    feeType: f.feeType,
    ratePct: f.ratePct,
    description: f.description
  })));

  console.log("\n=== Volume Commission Tiers ===");
  const tiers = await prisma.volumeCommissionTier.findMany();
  console.table(tiers.map(t => ({
    module: t.module,
    tierName: t.tierName,
    minOrders: t.minMonthlyOrders,
    maxOrders: t.maxMonthlyOrders,
    commissionPct: t.commissionPct
  })));

  try {
    console.log("\n=== Corporate Seat Tiers ===");
    // Attempting to query corporate seat tiers if it exists
    const corpTiers = await prisma.corporateSeatTier.findMany();
    console.table(corpTiers);
  } catch(e) {
    console.log("No corporateSeatTier table found or error:", e.message);
  }
}

check().then(() => prisma.$disconnect()).catch(console.error);
