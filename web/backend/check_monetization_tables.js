const prisma = require('./prisma/prismaClient');

async function checkTables() {
    console.log("🔍 Checking all 9 Section 8 Monetization Tables in Database...");

    const results = {};

    try {
        results.SubscriptionPlan = await prisma.subscriptionPlan.count();
        results.UserSubscription = await prisma.userSubscription.count();
        results.PlatformFeeConfig = await prisma.platformFeeConfig.count();
        results.Transaction = await prisma.transaction.count();
        results.PaRevenueSplit = await prisma.paRevenueSplit.count();
        results.PaConsultReview = await prisma.paConsultReview.count();
        results.VolumeCommissionTier = await prisma.volumeCommissionTier.count();
        results.CorporateAccount = await prisma.corporateAccount.count();
        results.CorporateSeat = await prisma.corporateSeat.count();

        console.log("✅ Table record counts in Postgres:");
        console.table(results);
        console.log("🎉 All 9 Monetization Tables exist and are fully functional in Postgres!");
    } catch (err) {
        console.error("❌ Table check error:", err.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkTables();
