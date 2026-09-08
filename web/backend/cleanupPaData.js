const prisma = require('./prisma/prismaClient');

async function cleanupTestData() {
    const DUMMY_ID = "1021889f-e6f8-4b08-b1fc-401ee1d7ad12";
    try {
        await prisma.doctorPAAssignment.delete({
            where: { id: DUMMY_ID }
        });
        console.log(`✅ Cleanup complete. Dummy assignment ${DUMMY_ID} deleted permanently.`);
    } catch(e) {
        if (e.code === 'P2025') {
            console.log("⚠️ Dummy assignment already deleted or not found.");
        } else {
            console.error("Error during cleanup:", e);
        }
    } finally {
        await prisma.$disconnect();
    }
}
cleanupTestData();
