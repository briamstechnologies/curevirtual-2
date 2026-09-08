const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log("Adding column 'seatTier' to 'CorporateAccount' table if not exists...");
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "CorporateAccount" ADD COLUMN IF NOT EXISTS "seatTier" TEXT;
    `);
    console.log("✅ Column 'seatTier' ensured successfully.");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
