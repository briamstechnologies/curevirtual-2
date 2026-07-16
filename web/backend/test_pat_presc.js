const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getPatientProfileIdByUserId } = require('./routes/patientRoutes');

async function main() {
  const patientUserId = 'e0e3fac3-0ee7-4e77-a5bb-d8420be5a015'; // Ahmed Aliraza User ID
  const pId = await prisma.patientProfile.findUnique({where:{userId:patientUserId}});
  console.log('PID:', pId?.id);

  const prescriptions = await prisma.prescription.findMany({
    where: { patientId: pId?.id },
  });
  console.log("Patient Prescriptions:", prescriptions.length);
}
main().finally(() => prisma.$disconnect());
