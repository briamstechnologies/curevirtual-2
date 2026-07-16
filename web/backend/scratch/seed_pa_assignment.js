const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const userId = "46489f0f-2b8d-4d14-9358-6a2bf1790ad6"; // The PA
  const doctorUserId = "ab63d5d3-0dc6-4711-b242-c7c8d4ab8dc6"; // The DOCTOR

  // 1. Ensure Doctor Profile exists
  let doctorProfile = await prisma.doctorProfile.findUnique({ where: { userId: doctorUserId } });
  if (!doctorProfile) {
    doctorProfile = await prisma.doctorProfile.create({
      data: {
        userId: doctorUserId,
        specialization: "General Practice",
        qualifications: "MD",
        licenseNumber: "DOC123456",
        hospitalAffiliation: "General Hospital",
        yearsOfExperience: 10,
        consultationFee: 50,
      }
    });
    console.log("Created Doctor Profile");
  } else {
    console.log("Doctor Profile exists");
  }

  // 2. Ensure PA Profile exists
  let paProfile = await prisma.physicianAssistantProfile.findUnique({ where: { userId } });
  if (!paProfile) {
    paProfile = await prisma.physicianAssistantProfile.create({
      data: {
        userId,
        licenseNumber: "PA-789012",
        licenseVerified: true,
        specialty: "General Practice",
        status: "ACTIVE"
      }
    });
    console.log("Created PA Profile");
  } else {
    console.log("PA Profile exists");
  }

  // 3. Ensure Assignment exists
  let assignment = await prisma.doctorPAAssignment.findFirst({
    where: { paId: paProfile.id, doctorId: doctorProfile.id }
  });
  if (!assignment) {
    assignment = await prisma.doctorPAAssignment.create({
      data: {
        paId: paProfile.id,
        doctorId: doctorProfile.id,
        assignmentStatus: "ACTIVE"
      }
    });
    console.log("Created PA Assignment");
  } else {
    console.log("PA Assignment exists");
  }

  console.log("All fixed!");
}

fix()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
