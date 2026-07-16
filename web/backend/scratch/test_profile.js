const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const userId = 'ab63d5d3-0dc6-4711-b242-c7c8d4ab8dc6';
  
  const doctorData = {
    specialization: 'General Medicine',
    qualifications: 'MBBS',
    licenseNumber: '123456',
    hospitalAffiliation: '',
    yearsOfExperience: 5,
    consultationFee: 50,
    availability: '{}',
    timezone: 'UTC',
    bio: '',
    languages: '["English"]',
    emergencyContact: '',
    emergencyContactName: '',
    emergencyContactEmail: '',
  };

  try {
    const updated = await prisma.doctorProfile.upsert({
      where: { userId },
      update: { ...doctorData },
      create: {
        userId,
        specialization: doctorData.specialization ?? "General Medicine",
        customProfession: null,
        qualifications: doctorData.qualifications ?? "MBBS",
        licenseNumber: doctorData.licenseNumber || `LIC-${userId.slice(0, 8).toUpperCase()}`,
        hospitalAffiliation: doctorData.hospitalAffiliation ?? "",
        yearsOfExperience: doctorData.yearsOfExperience ?? 0,
        consultationFee: doctorData.consultationFee ?? 0,
        availability: doctorData.availability,
        timezone: doctorData.timezone ?? "Asia/Karachi",
        bio: doctorData.bio ?? "",
        languages: doctorData.languages,
        emergencyContact: doctorData.emergencyContact ?? "",
        emergencyContactName: doctorData.emergencyContactName ?? "",
        emergencyContactEmail: doctorData.emergencyContactEmail ?? "",
      },
      include: { user: true },
    });
    console.log("Success!", updated.id);
  } catch (err) {
    console.error("Prisma Error:", err);
  }
}
main().finally(() => prisma.$disconnect());
