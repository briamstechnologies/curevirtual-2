const prisma = require('./prisma/prismaClient');

async function getDummyAssignmentId() {
    try {
        const dummy = await prisma.doctorPAAssignment.findFirst({
            where: { createdBy: 'system' }
        });
        if (dummy) {
            console.log("Dummy Assignment ID found:", dummy.id);
        } else {
            console.log("No dummy assignment found.");
        }
    } catch(e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
getDummyAssignmentId();
