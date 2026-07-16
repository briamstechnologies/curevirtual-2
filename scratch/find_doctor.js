const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: 'DOCTOR' }
  });
  console.log('Users found:', users.map(u => ({ id: u.id, email: u.email })));
  
  const doctor = await prisma.doctorProfile.findUnique({
    where: { userId: 'ab63d5d3-0dc6-4711-b242-c7c8d4ab8dc6' }
  });
  console.log('DoctorProfile found:', doctor);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
