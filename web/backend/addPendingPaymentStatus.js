const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addPendingPaymentStatus() {
    try {
        console.log("Starting migration: Adding 'pending_payment' to UserSubscriptionStatus enum...");
        
        // Use raw query to alter the enum
        await prisma.$executeRawUnsafe(`ALTER TYPE "UserSubscriptionStatus" ADD VALUE IF NOT EXISTS 'pending_payment';`);
        
        console.log("✅ Successfully added 'pending_payment' to UserSubscriptionStatus enum.");
        console.log("⚠️ IMPORTANT: Please run 'npx prisma generate' if Prisma Client complains, though it usually handles raw enum additions fine.");
    } catch (e) {
        if (e.message.includes('already exists')) {
            console.log("✅ 'pending_payment' already exists in UserSubscriptionStatus.");
        } else {
            console.error("❌ Migration failed:", e);
        }
    } finally {
        await prisma.$disconnect();
    }
}

addPendingPaymentStatus();
