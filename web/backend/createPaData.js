const prisma = require('./prisma/prismaClient');

async function createTestData() {
    try {
        const appointment = await prisma.appointment.findFirst({
            where: { status: 'APPROVED' },
            include: { doctor: true }
        });

        const pa = await prisma.physicianAssistantProfile.findFirst();

        if (appointment && pa) {
            console.log("Found PA Profile:", pa.id);
            console.log("Found Doctor Profile:", appointment.doctorId);

            // Create assignment
            await prisma.doctorPAAssignment.create({
                data: {
                    doctorId: appointment.doctorId,
                    paId: pa.id,
                    assignmentStatus: 'ACTIVE',
                    createdBy: 'system'
                }
            });
            console.log("✅ Dummy PA Assignment created successfully for testing!");
        } else {
            console.log("Could not find a PA or Appointment in DB. Cannot create dummy PA test data.");
        }
    } catch(e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
createTestData();
