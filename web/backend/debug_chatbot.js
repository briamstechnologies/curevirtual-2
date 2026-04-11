const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugChatbot() {
  try {
    console.log("--- Starting Chatbot Debug ---");
    
    // 1. Test Specialty Query (Suspicious distinct)
    console.log("Testing unique specialties query...");
    const uniqueSpecialties = await prisma.doctorProfile.findMany({
      select: { specialization: true },
      distinct: ['specialization']
    });
    console.log("Success! Specialties found:", uniqueSpecialties.length);

    // 2. Test User Context fetching (Mock userId)
    // We'll just fetch a random user to see if the query structure works
    console.log("Testing user context fetching structure...");
    const user = await prisma.user.findFirst({
      include: {
        patient: true,
        doctor: true
      }
    });
    
    if (user && user.patient) {
      console.log("Testing patient specific queries...");
      const [appointments, prescriptions] = await Promise.all([
        prisma.appointment.findMany({
          where: { patientId: user.patient.id },
          orderBy: { appointmentDate: 'desc' },
          take: 3,
          include: {
            doctor: {
              include: { user: { select: { firstName: true, lastName: true } } }
            }
          }
        }),
        prisma.prescription.findMany({
          where: { patientId: user.patient.id },
          orderBy: { createdAt: 'desc' },
          take: 5
        })
      ]);
      console.log("Success! Fetched data for user:", user.email);
    } else {
      console.log("No patient user found to test profile queries.");
    }

    console.log("--- Debug Finished Successfully ---");
  } catch (err) {
    console.error("DEBUG ERROR DETECTED:");
    console.error("- Message:", err.message);
    console.error("- Code:", err.code);
    console.error("- Stack:", err.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugChatbot();
