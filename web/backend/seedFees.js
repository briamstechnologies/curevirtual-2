const prisma = require('./prisma/prismaClient');

async function updateDb() {
    console.log("🛠️ Adding new values to FeeType Enum in the database...");
    try {
        // Postgres syntax to add to ENUM
        await prisma.$executeRawUnsafe(`ALTER TYPE "public"."FeeType" ADD VALUE IF NOT EXISTS 'doctor_consultation';`);
        await prisma.$executeRawUnsafe(`ALTER TYPE "public"."FeeType" ADD VALUE IF NOT EXISTS 'doctor_consultation_subscribed';`);
        await prisma.$executeRawUnsafe(`ALTER TYPE "public"."FeeType" ADD VALUE IF NOT EXISTS 'pa_consultation';`);
        console.log("✅ Enum values successfully added to Postgres.");
    } catch (e) {
        console.log("⚠️ Enum values might already exist or require Supabase Dashboard:", e.message);
    }

    console.log("\n🌱 Seeding PlatformFeeConfig table with actual rows...");
    
    const fees = [
        { feeType: "doctor_consultation", ratePct: 12 },
        { feeType: "doctor_consultation_subscribed", ratePct: 8 },
        { feeType: "pa_consultation", ratePct: 10 },
        { feeType: "payment_processing", ratePct: 1.95 },
        { feeType: "transfer_levy", ratePct: 0.0 },
        { feeType: "vat_stack", ratePct: 20.0 }
    ];

    let inserted = 0;
    for (const fee of fees) {
        // Only insert if it doesn't have an active row
        const existing = await prisma.platformFeeConfig.findFirst({
            where: { feeType: fee.feeType, effectiveTo: null }
        });

        if (!existing) {
            await prisma.platformFeeConfig.create({
                data: {
                    feeType: fee.feeType,
                    ratePct: fee.ratePct,
                    effectiveFrom: new Date(),
                    sourceNote: "Initial Phase 2 Seeding"
                }
            });
            console.log(`✅ Inserted row for ${fee.feeType}: ${fee.ratePct}%`);
            inserted++;
        } else {
             console.log(`⏩ Row for ${fee.feeType} already active in DB.`);
        }
    }
    console.log(`\n✅ Seeding complete. Inserted ${inserted} new configurations.`);
}

updateDb().catch(e => console.error(e)).finally(() => prisma.$disconnect());
