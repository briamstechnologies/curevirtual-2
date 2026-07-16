const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const pa = await prisma.physicianAssistantProfile.findFirst({
    include: {
      assignments: {
        where: { assignmentStatus: "ACTIVE" },
        include: {
          doctor: {
            select: {
              id: true,
              userId: true,
              user: {
                select: { firstName: true, lastName: true, email: true },
              },
            },
          },
        },
      },
    },
  });
  console.log(JSON.stringify(pa, null, 2));
}
test().catch(console.error).finally(() => prisma.$disconnect());
