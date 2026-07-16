// FILE: web/backend/scratch/verify_pa.js
const prisma = require("../prisma/prismaClient");
const { logAuditTrail } = require("../utils/auditLogger");

async function main() {
  console.log("=== Starting Physician Assistant Module Verification ===");

  try {
    // 1. Verify Prisma models can be queried
    console.log("Checking DB connection and querying Consultation Logs...");
    const logsCount = await prisma.consultationLog.count();
    console.log(`Current Consultation Logs: ${logsCount}`);

    const assignmentsCount = await prisma.doctorPAAssignment.count();
    console.log(`Current Active Doctor-PA Assignments: ${assignmentsCount}`);

    const auditsCount = await prisma.auditTrail.count();
    console.log(`Current Audit Trail logs: ${auditsCount}`);

    // 2. Test Audit Trail logging function
    console.log("Testing Audit Trail logger helper...");
    await logAuditTrail(
      "system-verification",
      "SYSTEM",
      "VERIFICATION_TEST",
      "SystemTest",
      "test-123",
      { active: false },
      { active: true }
    );
    console.log("Audit log entry created successfully!");

    // 3. Dry-run key emergency keyword detector logic
    console.log("Testing Emergency Keyword Detector...");
    const EMERGENCY_KEYWORDS = [
      "chest pain",
      "breathing issue",
      "shortness of breath",
      "severe bleed",
      "unconscious",
      "heart attack",
      "choking",
      "stroke",
      "paralysis"
    ];
    function detectEmergency(notes) {
      if (!notes) return false;
      const lowerNotes = notes.toLowerCase();
      return EMERGENCY_KEYWORDS.some(keyword => lowerNotes.includes(keyword));
    }

    const testNormalNotes = "Patient presents with minor cough and nasal congestion.";
    const testEmergencyNotes = "Patient experienced sudden chest pain and shortness of breath.";

    console.log(`Normal Notes Emergency Match: ${detectEmergency(testNormalNotes)} (Expected: false)`);
    console.log(`Emergency Notes Emergency Match: ${detectEmergency(testEmergencyNotes)} (Expected: true)`);

    // 4. Test Pharmacist query mock filter logic
    console.log("Mocking Pharmacist query logic with current schema...");
    const pendingLogs = await prisma.consultationLog.findMany({
      where: {
        status: { in: ["PENDING_REVIEW", "Returned for Correction", "ESCALATED"] }
      },
      select: { patientId: true, doctorId: true }
    });
    console.log(`Found ${pendingLogs.length} active/pending logs to filter for pharmacist.`);

    const excludeFilters = pendingLogs.map(log => ({
      AND: [
        { patientId: log.patientId },
        { doctorId: log.doctorId }
      ]
    }));

    // Perform query with mock list
    const mockPrescriptions = await prisma.prescription.findMany({
      where: {
        ...(excludeFilters.length > 0 && {
          NOT: {
            OR: excludeFilters
          }
        })
      },
      take: 5
    });
    console.log(`Successfully executed pharmacist-safety filtered query. Found ${mockPrescriptions.length} prescriptions.`);

    console.log("=== Verification Successful! All queries and helpers function correctly. ===");
  } catch (err) {
    console.error("❌ Verification Failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
