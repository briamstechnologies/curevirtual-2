const prisma = require('../prisma/prismaClient');

async function run() {
  console.log("=== PA & Doctor Feature DB Verification ===");

  // Find a Doctor User
  let doctor = await prisma.user.findFirst({
    where: { role: 'DOCTOR' },
    include: { doctor: true }
  });

  if (!doctor) {
    console.log("No doctor found. Creating a test doctor...");
    doctor = await prisma.user.create({
      data: {
        firstName: "Test",
        lastName: "Doctor",
        email: `test_doctor_${Date.now()}@curevirtual.com`,
        role: "DOCTOR",
        dateOfBirth: new Date("1980-01-01"),
        gender: "MALE",
        doctor: {
          create: {
            specialization: "General Practice",
            qualifications: "MD",
            licenseNumber: `LIC-${Math.random().toString(36).substring(7).toUpperCase()}`,
            consultationFee: 50.0
          }
        }
      },
      include: { doctor: true }
    });
  }

  console.log(`Doctor: ${doctor.firstName} ${doctor.lastName} (ID: ${doctor.id}), Profile ID: ${doctor.doctor?.id}`);

  // Find a PA User
  let pa = await prisma.user.findFirst({
    where: { role: 'PHYSICIAN_ASSISTANT' },
    include: { physicianAssistant: true }
  });

  if (!pa) {
    console.log("No PA found. Creating a test PA...");
    pa = await prisma.user.create({
      data: {
        firstName: "Test",
        lastName: "Assistant",
        email: `test_pa_${Date.now()}@curevirtual.com`,
        role: "PHYSICIAN_ASSISTANT",
        dateOfBirth: new Date("1990-01-01"),
        gender: "FEMALE"
      },
      include: { physicianAssistant: true }
    });
  }

  console.log(`Physician Assistant: ${pa.firstName} ${pa.lastName} (ID: ${pa.id})`);

  // Link PA with Doctor
  console.log("Linking PA to Doctor in DB...");
  const link = await prisma.physicianAssistant.upsert({
    where: { userId: pa.id },
    update: { assignedDoctorId: doctor.doctor.id },
    create: {
      userId: pa.id,
      assignedDoctorId: doctor.doctor.id
    }
  });
  console.log("Link created successfully:", link);

  // Test 1: Set Doctor offline
  console.log("Setting Doctor offline...");
  await prisma.doctorProfile.update({
    where: { id: doctor.doctor.id },
    data: { isOnline: false }
  });

  // Verify PA can resolve Doctor profile
  const resolvedOffline = await prisma.physicianAssistant.findUnique({
    where: { userId: pa.id },
    include: { doctor: true }
  });
  console.log(`Doctor online status: ${resolvedOffline.doctor.isOnline}`);
  if (!resolvedOffline.doctor.isOnline) {
    console.log("✅ SUCCESS: Doctor is offline, PA has link.");
  } else {
    console.log("❌ FAILURE: Doctor should be offline.");
  }

  // Test 2: Set Doctor online
  console.log("Setting Doctor online...");
  await prisma.doctorProfile.update({
    where: { id: doctor.doctor.id },
    data: { isOnline: true }
  });

  const resolvedOnline = await prisma.physicianAssistant.findUnique({
    where: { userId: pa.id },
    include: { doctor: true }
  });
  console.log(`Doctor online status: ${resolvedOnline.doctor.isOnline}`);
  if (resolvedOnline.doctor.isOnline) {
    console.log("✅ SUCCESS: Doctor is online, PA link updated.");
  } else {
    console.log("❌ FAILURE: Doctor should be online.");
  }

  // Clean up if we created dummy users
  if (doctor.email.startsWith("test_doctor_")) {
    console.log("Cleaning up test doctor and PA...");
    await prisma.physicianAssistant.delete({ where: { userId: pa.id } });
    await prisma.user.delete({ where: { id: pa.id } });
    await prisma.user.delete({ where: { id: doctor.id } });
    console.log("Cleanup complete!");
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
