const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const userId = '6af90734-de36-4b3d-ab5f-8337bd3ac18c'; // Ahmed Din userId
  const updatedProfile = await prisma.doctorProfile.update({
    where: { userId },
    data: { isOnline: false },
    select: { id: true, isOnline: true }
  });
  console.log('Updated to offline:', updatedProfile.isOnline);
  
  const updatedProfile2 = await prisma.doctorProfile.update({
    where: { userId },
    data: { isOnline: true },
    select: { id: true, isOnline: true }
  });
  console.log('Updated to online:', updatedProfile2.isOnline);
}
main().finally(() => prisma.$disconnect());
