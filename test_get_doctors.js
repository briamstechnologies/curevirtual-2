const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  const patientUserId = "ab63d5d3-0dc6-4711-b242-c7c8d4ab8dc6";
  try {
    console.log("Running getPatientProfileByUserId...");
    const { ensureDefaultProfile } = require("./lib/provisionProfile");
    
    let profile = await prisma.patientProfile.findUnique({ where: { userId: String(patientUserId) } });
    if (!profile) {
      profile = await prisma.patientProfile.findUnique({ where: { id: String(patientUserId) } });
    }
    if (!profile) {
      const user = await prisma.user.findUnique({ where: { id: String(patientUserId) } });
      if (user && user.role === "PATIENT") {
        profile = await ensureDefaultProfile(user);
      }
    }
    console.log("Patient Profile:", profile);

    console.log("Fetching links...");
    const links = await prisma.doctorPatient.findMany({
      where: { patientId: profile.id },
      include: { 
        doctor: { 
          include: { 
            user: true,
            schedules: {
              where: { isActive: true }
            }
          } 
        } 
      },
      orderBy: { createdAt: "desc" },
    });
    console.log("Links:", links);
  } catch (err) {
    console.error("❌ Error in backend logic:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
