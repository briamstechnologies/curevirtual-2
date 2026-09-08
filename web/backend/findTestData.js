const prisma = require('./prisma/prismaClient');

async function getTestData() {
    console.log("--- FINDING REAL TEST DATA FOR POSTMAN ---");

    try {
        // 1. Find a normal doctor appointment (no PA)
        const normalAppointment = await prisma.appointment.findFirst({
            where: { status: 'APPROVED' },
            include: { doctor: { include: { user: true } }, patient: true }
        });
        if (normalAppointment) {
            console.log("\n[1. Normal Consult Test Data]");
            console.log("Appointment ID:", normalAppointment.id);
            console.log("Amount GHS: 150");
            console.log("Doctor Profile ID:", normalAppointment.doctorId);
            console.log("Patient User ID (for Auth Token):", normalAppointment.patientId); // wait, patientId is profile id, we need userId
            const patientUser = await prisma.patientProfile.findUnique({where: {id: normalAppointment.patientId}});
            console.log("Patient User ID:", patientUser.userId);
        }

        // 2. Find a Doctor with an ACTIVE PA assignment
        const paAssignment = await prisma.doctorPAAssignment.findFirst({
            where: { assignmentStatus: 'ACTIVE' },
            include: { 
                doctor: { include: { user: true } }, 
                pa: { include: { user: true } } 
            }
        });

        if (paAssignment) {
            console.log("\n[2. PA Consult Test Data]");
            console.log("Doctor Profile ID:", paAssignment.doctorId);
            console.log("Doctor User Email (for Doctor login):", paAssignment.doctor.user.email);
            console.log("Assigned PA Profile ID:", paAssignment.paId);
            
            // Find an appointment for this doctor
            const paAppointment = await prisma.appointment.findFirst({
                where: { doctorId: paAssignment.doctorId }
            });

            if (paAppointment) {
                console.log("Appointment ID (linked to this doctor):", paAppointment.id);
                const pUser = await prisma.patientProfile.findUnique({where: {id: paAppointment.patientId}});
                console.log("Patient User Email (for Patient login):", pUser ? pUser.userId : "N/A"); 
            } else {
                console.log("No existing appointment found for this doctor. Create one in DB manually for testing.");
            }
        } else {
             console.log("\n[2. PA Consult Test Data]");
             console.log("NO ACTIVE PA ASSIGNMENTS FOUND IN DATABASE.");
        }

    } catch(e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

getTestData();
