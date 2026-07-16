const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTables() {
  try {
    console.log("Creating MedicationSchedule table...");
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "public"."MedicationSchedule" (
        "id" TEXT NOT NULL,
        "patientId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "dose" TEXT NOT NULL,
        "time" TEXT NOT NULL,
        "days" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "MedicationSchedule_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "MedicationSchedule_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `;

    console.log("Creating MedicationLog table...");
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "public"."MedicationLog" (
        "id" TEXT NOT NULL,
        "scheduleId" TEXT NOT NULL,
        "date" TEXT NOT NULL,
        "taken" BOOLEAN NOT NULL DEFAULT true,
        "takenAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MedicationLog_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "MedicationLog_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."MedicationSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `;

    console.log("Creating indexes...");
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "MedicationSchedule_patientId_idx" ON "public"."MedicationSchedule"("patientId");`;
    await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "MedicationLog_scheduleId_date_key" ON "public"."MedicationLog"("scheduleId", "date");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "MedicationLog_scheduleId_idx" ON "public"."MedicationLog"("scheduleId");`;
    
    console.log("Success!");
  } catch (error) {
    console.error("Error creating tables:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createTables();
