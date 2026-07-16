// FILE: backend/routes/consultations.js
const express = require("express");
const { verifyToken, requireRole } = require("../middleware/rbac.js");
const prisma = require("../prisma/prismaClient");
const { logAuditTrail } = require("../utils/auditLogger");

const router = express.Router();

// Apply auth token validation
router.use(verifyToken);

// Emergency Keywords Scanner
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

// POST /api/consultations/route
// Routes patient consultation based on severity and type
router.post("/route", async (req, res) => {
  try {
    const { patientId, consultationType, severityLevel, consultationNotes } = req.body || {};

    if (!patientId || !consultationType || !severityLevel) {
      return res.status(400).json({ error: "patientId, consultationType, and severityLevel are required." });
    }

    // Resolve PatientProfile
    const patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: patientId },
    });

    if (!patientProfile) {
      return res.status(404).json({ error: "Patient profile not found" });
    }

    // Auto-detect emergency symptoms
    const hasEmergencyKeywords = detectEmergency(consultationNotes);
    let finalSeverity = severityLevel.toUpperCase();
    let finalType = consultationType.toUpperCase();

    if (hasEmergencyKeywords) {
      finalSeverity = "CRITICAL";
      finalType = "EMERGENCY";
    }

    // Determine target role:
    // Doctor: Urgent cases, Emergency symptoms, Prescription requests, High/Critical severity
    // PA: Routine cases, Follow-ups, Low/Medium severity
    const routeToDoctor = 
      finalType === "URGENT" || 
      finalType === "EMERGENCY" || 
      finalType === "PRESCRIPTION_REQUEST" ||
      finalSeverity === "HIGH" || 
      finalSeverity === "CRITICAL";

    let doctorId = null;
    let paId = null;
    let requiresDoctorApproval = false;

    if (routeToDoctor) {
      // Find a doctor to assign
      const doctor = await prisma.doctorProfile.findFirst({
        orderBy: { createdAt: "asc" } // simple assignment strategy
      });
      if (!doctor) {
        return res.status(503).json({ error: "No doctors available in the system" });
      }
      doctorId = doctor.id;
    } else {
      // Find a verified active PA
      const pa = await prisma.physicianAssistantProfile.findFirst({
        where: { status: "ACTIVE", licenseVerified: true },
        include: {
          assignments: {
            where: { assignmentStatus: "ACTIVE" },
            include: { doctor: true }
          }
        },
        orderBy: { createdAt: "asc" }
      });

      if (pa && pa.assignments.length > 0) {
        paId = pa.id;
        doctorId = pa.assignments[0].doctor.id;
        requiresDoctorApproval = true;
      } else {
        // Fallback to Doctor if no PA is active/available
        const doctor = await prisma.doctorProfile.findFirst({
          orderBy: { createdAt: "asc" }
        });
        if (!doctor) {
          return res.status(503).json({ error: "No clinical staff available in the system" });
        }
        doctorId = doctor.id;
      }
    }

    // Create ConsultationLog record
    const log = await prisma.consultationLog.create({
      data: {
        patientId: patientProfile.id,
        doctorId,
        paId,
        consultationType: finalType,
        severityLevel: finalSeverity,
        consultationNotes,
        status: paId ? "PENDING_REVIEW" : "CLOSED", // if routed directly to doctor, it is handled by final authority directly (closed on creation or custom flow)
        requiresDoctorApproval,
      },
    });

    // Write to Audit Trail
    await logAuditTrail(
      req.user.id,
      req.user.role,
      "CONSULTATION_ROUTED",
      "ConsultationLog",
      log.id,
      null,
      log,
      req.ip
    );

    return res.status(201).json({
      message: `Consultation routed successfully to ${paId ? "Physician Assistant" : "Doctor"}`,
      data: log
    });
  } catch (err) {
    console.error("Routing error:", err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
