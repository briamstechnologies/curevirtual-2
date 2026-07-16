const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Applying schema changes manually via SQL...");
    
    // Add referenceId column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "public"."PatientProfile" 
      ADD COLUMN IF NOT EXISTS "referenceId" text UNIQUE,
      ADD COLUMN IF NOT EXISTS "country" text;
    `);

    console.log("✅ Successfully added referenceId and country to PatientProfile!");
  } catch (error) {
    console.error("❌ Error applying schema changes:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
