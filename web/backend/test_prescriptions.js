const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const prescriptions = await prisma.prescription.findMany({
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("Recent prescriptions:", prescriptions.length);
  prescriptions.forEach(p => {
    console.log(`ID: ${p.id} | Pat: ${p.patientId} (${p.patient?.user?.firstName}) | Doc: ${p.doctorId} (${p.doctor?.user?.firstName})`);
  });
}
main().finally(() => prisma.$disconnect());
