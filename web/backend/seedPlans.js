const prisma = require('./prisma/prismaClient');

async function seedPlans() {
    console.log("🌱 Seeding SubscriptionPlan table with Section 3 GHS startup rates...");

    const plans = [
        // Patient Family Health Plan
        {
            name: "Family Health Plan (Monthly)",
            module: "patient",
            billingCycle: "monthly",
            priceGHS: 40.0,
            priceUSD: 3.5,
            perks: { consultationDiscountPct: 20, maxFamilyMembers: 4, prioritySupport: true }
        },
        {
            name: "Family Health Plan (Annual)",
            module: "patient",
            billingCycle: "annual",
            priceGHS: 400.0,
            priceUSD: 35.0,
            perks: { consultationDiscountPct: 20, maxFamilyMembers: 4, prioritySupport: true, annualSavings: "17%" }
        },

        // Doctor Subscription
        {
            name: "Doctor Pro Plan (Monthly)",
            module: "doctor",
            billingCycle: "monthly",
            priceGHS: 100.0,
            priceUSD: 9.0,
            commissionRateOverride: 8.0,
            perks: { reducedCommissionPct: 8, priorityListing: true, advancedAnalytics: true, directMessaging: true }
        },
        {
            name: "Doctor Pro Plan (Annual)",
            module: "doctor",
            billingCycle: "annual",
            priceGHS: 1000.0,
            priceUSD: 90.0,
            commissionRateOverride: 8.0,
            perks: { reducedCommissionPct: 8, priorityListing: true, advancedAnalytics: true, directMessaging: true, annualSavings: "17%" }
        },

        // Laboratory Subscription
        {
            name: "Lab Partner Plan (Monthly)",
            module: "laboratory",
            billingCycle: "monthly",
            priceGHS: 150.0,
            priceUSD: 13.0,
            perks: { inventorySync: true, priorityOrderRouting: true, labAnalyticsDashboard: true }
        },
        {
            name: "Lab Partner Plan (Annual)",
            module: "laboratory",
            billingCycle: "annual",
            priceGHS: 1500.0,
            priceUSD: 130.0,
            perks: { inventorySync: true, priorityOrderRouting: true, labAnalyticsDashboard: true, annualSavings: "17%" }
        },

        // Pharmacy Subscription
        {
            name: "Pharmacy Partner Plan (Monthly)",
            module: "pharmacy",
            billingCycle: "monthly",
            priceGHS: 150.0,
            priceUSD: 13.0,
            perks: { inventorySync: true, priorityOrderRouting: true, pharmacyAnalyticsDashboard: true }
        },
        {
            name: "Pharmacy Partner Plan (Annual)",
            module: "pharmacy",
            billingCycle: "annual",
            priceGHS: 1500.0,
            priceUSD: 130.0,
            perks: { inventorySync: true, priorityOrderRouting: true, pharmacyAnalyticsDashboard: true, annualSavings: "17%" }
        }
    ];

    let count = 0;
    for (const planData of plans) {
        const existing = await prisma.subscriptionPlan.findFirst({
            where: {
                module: planData.module,
                name: planData.name,
                billingCycle: planData.billingCycle
            }
        });

        if (!existing) {
            await prisma.subscriptionPlan.create({
                data: planData
            });
            console.log(`✅ Created plan: ${planData.name} (${planData.priceGHS} GHS)`);
            count++;
        } else {
            await prisma.subscriptionPlan.update({
                where: { id: existing.id },
                data: planData
            });
            console.log(`🔄 Updated plan: ${planData.name} (${planData.priceGHS} GHS)`);
        }
    }

    console.log(`\n✅ Seeding complete. Processed ${plans.length} subscription plans.`);
}

seedPlans().catch(e => console.error(e)).finally(() => prisma.$disconnect());
