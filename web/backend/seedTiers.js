const prisma = require('./prisma/prismaClient');

async function seedVolumeTiers() {
    console.log("🌱 Verifying and Seeding Lab & Pharmacy Volume Commission Tiers (Section 5)...");

    const modules = ['laboratory', 'pharmacy'];

    const defaultTiers = [
        { tierName: 'Tier 1', minMonthlyOrders: 0, maxMonthlyOrders: 49, commissionPct: 15.0 },
        { tierName: 'Tier 2', minMonthlyOrders: 50, maxMonthlyOrders: 199, commissionPct: 12.0 },
        { tierName: 'Tier 3', minMonthlyOrders: 200, maxMonthlyOrders: null, commissionPct: 10.0 }
    ];

    let inserted = 0;
    for (const mod of modules) {
        for (const tier of defaultTiers) {
            const existing = await prisma.volumeCommissionTier.findFirst({
                where: {
                    module: mod,
                    tierName: tier.tierName
                }
            });

            if (!existing) {
                await prisma.volumeCommissionTier.create({
                    data: {
                        module: mod,
                        tierName: tier.tierName,
                        minMonthlyOrders: tier.minMonthlyOrders,
                        maxMonthlyOrders: tier.maxMonthlyOrders,
                        commissionPct: tier.commissionPct,
                        isActive: true
                    }
                });
                console.log(`✅ Created tier for ${mod}: ${tier.tierName} (${tier.minMonthlyOrders}-${tier.maxMonthlyOrders ?? '∞'} orders => ${tier.commissionPct}%)`);
                inserted++;
            } else {
                await prisma.volumeCommissionTier.update({
                    where: { id: existing.id },
                    data: {
                        minMonthlyOrders: tier.minMonthlyOrders,
                        maxMonthlyOrders: tier.maxMonthlyOrders,
                        commissionPct: tier.commissionPct,
                        isActive: true
                    }
                });
                console.log(`🔄 Updated tier for ${mod}: ${tier.tierName} (${tier.minMonthlyOrders}-${tier.maxMonthlyOrders ?? '∞'} orders => ${tier.commissionPct}%)`);
            }
        }
    }

    console.log(`\n✅ Volume commission tier verification complete.`);
}

seedVolumeTiers().catch(e => console.error(e)).finally(() => prisma.$disconnect());
