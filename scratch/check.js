const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.patientProfile.count();
  console.log('Total Patients:', count);
  const allP = await prisma.patientProfile.findMany({ include: { user: true } });
  console.log(JSON.stringify(allP, null, 2));
}
main().finally(() => prisma.$disconnect());
