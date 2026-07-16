const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const userId = '6af90734-de36-4b3d-ab5f-8337bd3ac18c'; // Ahmed Din userId
  const profile = await prisma.doctorProfile.findUnique({
    where: { userId },
    include: { user: true },
  });
  console.log("Direct Prisma query isOnline:", profile.isOnline);
}
main().finally(() => prisma.$disconnect());
