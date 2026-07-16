const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "public"."DoctorProfile" ADD COLUMN "isOnline" BOOLEAN NOT NULL DEFAULT false;`);
    console.log("Added isOnline to DoctorProfile");
  } catch(e) { console.error(e.message); }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "public"."PhysicianAssistantProfile" ADD COLUMN "isAllowedByDoctor" BOOLEAN NOT NULL DEFAULT false;`);
    console.log("Added isAllowedByDoctor to PhysicianAssistantProfile");
  } catch(e) { console.error(e.message); }
}
main().finally(() => prisma.$disconnect());
