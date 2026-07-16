const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTable() {
  try {
    console.log("Creating PatientHealthRecord table...");
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "public"."PatientHealthRecord" (
        "id" TEXT NOT NULL,
        "patientId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "provider" TEXT NOT NULL,
        "date" TEXT NOT NULL,
        "note" TEXT NOT NULL,
        "icon" TEXT DEFAULT 'clinical_notes',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PatientHealthRecord_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "PatientHealthRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `;

    console.log("Creating index...");
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "PatientHealthRecord_patientId_idx" ON "public"."PatientHealthRecord"("patientId");`;
    
    console.log("Success creating PatientHealthRecord table!");
  } catch (error) {
    console.error("Error creating table:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createTable();
