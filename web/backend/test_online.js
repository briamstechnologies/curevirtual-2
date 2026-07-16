const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const dr = await prisma.doctorProfile.findUnique({ where: { userId: '6af90734-de36-4b3d-ab5f-8337bd3ac18c' } });
  console.log('Doctor online status:', dr.isOnline);
}
main().finally(() => prisma.$disconnect());
