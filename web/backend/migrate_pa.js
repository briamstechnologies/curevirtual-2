const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "public"."PhysicianAssistantProfile"
      ADD COLUMN IF NOT EXISTS "canAccessAppointments" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "canAccessMySchedule" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "canAccessLabReports" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "canAccessTelehealthBridge" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "canAccessSecureInbox" BOOLEAN NOT NULL DEFAULT false;
    `);
    console.log("Successfully added columns to PhysicianAssistantProfile");
  } catch (e) {
    console.error("Error altering table:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
