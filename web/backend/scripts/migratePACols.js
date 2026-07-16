const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migratePAColumns() {
  try {
    console.log('--- Migrating PhysicianAssistantProfile and DoctorProfile tables ---');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "PhysicianAssistantProfile"
      ADD COLUMN IF NOT EXISTS "referenceId" TEXT,
      ADD COLUMN IF NOT EXISTS "supervisingDoctorId" TEXT,
      ADD COLUMN IF NOT EXISTS "verificationStatus" TEXT DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS "country" TEXT;
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "DoctorProfile"
      ADD COLUMN IF NOT EXISTS "referenceId" TEXT,
      ADD COLUMN IF NOT EXISTS "supervisingDoctorId" TEXT,
      ADD COLUMN IF NOT EXISTS "verificationStatus" TEXT DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS "country" TEXT;
    `);

    console.log('✅ Successfully added PA referenceId, supervisingDoctorId, verificationStatus, and country to tables!');
  } catch (err) {
    console.error('❌ Error altering PA profile tables:', err);
  } finally {
    await prisma.$disconnect();
  }
}

migratePAColumns();
