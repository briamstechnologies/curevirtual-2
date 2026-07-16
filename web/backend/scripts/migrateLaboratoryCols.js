const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateLaboratoryColumns() {
  try {
    console.log('--- Migrating LaboratoryProfile table columns ---');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "LaboratoryProfile"
      ADD COLUMN IF NOT EXISTS "referenceId" TEXT,
      ADD COLUMN IF NOT EXISTS "verificationStatus" TEXT DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS "laboratoryName" TEXT;
    `);
    console.log('✅ Successfully added referenceId, verificationStatus, and laboratoryName to LaboratoryProfile table!');
  } catch (err) {
    console.error('❌ Error altering LaboratoryProfile table:', err);
  } finally {
    await prisma.$disconnect();
  }
}

migrateLaboratoryColumns();
