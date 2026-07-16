const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const doctorUserId = '6af90734-de36-4b3d-ab5f-8337bd3ac18c'; // Ahmed Din userId
  const doctor = await prisma.doctorProfile.findUnique({ where: { userId: doctorUserId } });
  
  if (!doctor) {
    console.log("No doctor");
    return;
  }

  const where = {
    doctorLinks: { some: { doctorId: doctor.id } }, // assigned to this doctor
  };

  let patients = await prisma.patientProfile.findMany({
    where,
    include: { user: true },
    orderBy: [{ createdAt: "desc" }],
  });
  console.log("Found patients:", patients.length);
  patients.forEach(p => console.log(p.user.name));
}
main().finally(() => prisma.$disconnect());
