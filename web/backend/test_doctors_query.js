const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const doctors = await prisma.doctorProfile.findMany({
    include: {
      user: true,
      schedules: {
        where: { isActive: true }
      }
    },
  });
  console.log("All doctors length:", doctors.length);
  doctors.forEach(d => console.log(d.id, d.user.firstName, d.user.lastName));
}
main().finally(() => prisma.$disconnect());
