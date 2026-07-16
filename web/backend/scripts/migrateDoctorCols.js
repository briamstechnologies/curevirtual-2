const prisma = require('../prisma/prismaClient');

async function main() {
  console.log('Adding columns to DoctorProfile...');
  await prisma.$executeRawUnsafe(`ALTER TABLE "DoctorProfile" ADD COLUMN IF NOT EXISTS "referenceId" TEXT UNIQUE;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "DoctorProfile" ADD COLUMN IF NOT EXISTS "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING';`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "DoctorProfile" ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'GH';`);
  console.log('✅ Columns added successfully to DoctorProfile!');
}

main().catch(e => {
  console.error('Migration error:', e);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
