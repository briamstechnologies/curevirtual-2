const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const prisma = require("../prisma/prismaClient");
const { verifyToken } = require("../middleware/rbac");

/* ============================================================
   Helper: Fetch appointment with doctor/patient user info
   ============================================================ */
async function getAppointmentWithUsers(id) {
  return prisma.appointment.findUnique({
    where: { id },
    include: {
      doctor: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      patient: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });
}

/* ============================================================
   GET /api/appointments/:id
   Fetches appointment details including roomName & callStatus.
   Access control: Only the assigned doctor or patient.
   ============================================================ */
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const appointment = await getAppointmentWithUsers(id);

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const isDoctor = appointment.doctor?.user?.id === userId;
    const isPatient = appointment.patient?.user?.id === userId;
    const isStaff = ["PHYSICIAN_ASSISTANT", "ADMIN", "SUPERADMIN"].includes(req.user.role);

    if (!isDoctor && !isPatient && !isStaff) {
      return res
        .status(403)
        .json({ error: "You are not authorized to access this appointment" });
    }

    return res.json({
      id: appointment.id,
      doctorId: appointment.doctorId,
      doctorUserId: appointment.doctor.user.id,
      patientId: appointment.patientId,
      patientUserId: appointment.patient.user.id,
      roomName: appointment.roomName,
      callStatus: appointment.callStatus,
      appointmentDate: appointment.appointmentDate,
      status: appointment.status,
      doctorName: `${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName}`,
      patientName: `${appointment.patient.user.firstName} ${appointment.patient.user.lastName}`,
    });
  } catch (err) {
    console.error("❌ GET /api/appointments/:id error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================
   POST /api/appointments/:id/start-call
   Doctor initiates a call → callStatus = "requested"
   ============================================================ */
router.post("/:id/start-call", verifyToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  console.log(`[AppointmentAPI] 🚀 StartCall attempt - ID: ${id}, User: ${userId}`);

  try {
    // 🛠️ VALIDATION: Ensure ID is a valid UUID format to prevent Prisma P2023 errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.warn(`[AppointmentAPI] ⚠️ Invalid UUID format: ${id}`);
      return res.status(400).json({ 
        error: "Invalid appointment ID format.",
        details: "Expected a valid UUID string."
      });
    }

    const appointment = await getAppointmentWithUsers(id);

    if (!appointment) {
      console.warn(`[AppointmentAPI] 🔍 Appointment not found: ${id}`);
      return res.status(404).json({ error: "Appointment not found" });
    }

    // Only the assigned doctor can start a call
    if (appointment.doctor.user.id !== userId) {
      console.warn(`[AppointmentAPI] 🚫 Unauthorized: User ${userId} is not assigned to appointment ${id}`);
      return res
        .status(403)
        .json({ error: "Only the assigned doctor can start this call" });
    }

    // Idempotent: if already requested, return current roomName so doctor can rejoin
    if (appointment.callStatus === "requested") {
      return res.json({
        success: true,
        callStatus: appointment.callStatus,
        roomName: appointment.roomName,
        message: "Call already requested — joining existing room",
      });
    }
    if (appointment.callStatus === "active") {
      return res.json({
        success: true,
        callStatus: appointment.callStatus,
        roomName: appointment.roomName,
        message: "Call already in progress — rejoining",
      });
    }

    // Generate ZEGO-safe room name (alphanumeric only, no hyphens)
    const roomName =
      appointment.roomName ||
      `appointment${appointment.id.replace(/-/g, '')}${crypto.randomUUID().slice(0, 8).replace(/-/g, '')}`;

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        callStatus: "requested",
        roomName,
      },
    });

    console.log(`[AppointmentAPI] ✅ Call started for ${id}, Room: ${roomName}`);

    return res.json({
      success: true,
      callStatus: updated.callStatus,
      roomName: updated.roomName,
      message: "Call request sent to patient",
    });
  } catch (err) {
    console.error("❌ POST /api/appointments/:id/start-call error:", err);
    return res.status(500).json({ error: "Failed to start call", details: err.message });
  }
});

/* ============================================================
   GET /api/appointments/:id/status
   Poll current callStatus (for patient notification system)
   ============================================================ */
router.get("/:id/status", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const appointment = await getAppointmentWithUsers(id);

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const isDoctor = appointment.doctor?.user?.id === userId;
    const isPatient = appointment.patient?.user?.id === userId;
    const isStaff = ["PHYSICIAN_ASSISTANT", "ADMIN", "SUPERADMIN"].includes(req.user.role);

    if (!isDoctor && !isPatient && !isStaff) {
      return res
        .status(403)
        .json({ error: "Not authorized to view this appointment status" });
    }

    return res.json({
      appointmentId: appointment.id,
      callStatus: appointment.callStatus,
      roomName: appointment.roomName,
    });
  } catch (err) {
    console.error("❌ GET /api/appointments/:id/status error:", err);
    return res.status(500).json({ error: "Failed to get call status" });
  }
});

/* ============================================================
   POST /api/appointments/:id/join-call
   Patient accepts the call → callStatus = "active"
   ============================================================ */
router.post("/:id/join-call", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const appointment = await getAppointmentWithUsers(id);

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    // Only the assigned patient can join
    if (appointment.patient.user.id !== userId) {
      return res
        .status(403)
        .json({ error: "Only the assigned patient can join this call" });
    }

    // Must be in "requested" or "active" state
    if (appointment.callStatus === "idle") {
      return res
        .status(400)
        .json({ error: "Doctor has not started the call yet" });
    }
    if (appointment.callStatus === "ended") {
      return res
        .status(400)
        .json({ error: "This call session has already ended" });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { callStatus: "active" },
    });

    return res.json({
      success: true,
      callStatus: updated.callStatus,
      roomName: updated.roomName,
    });
  } catch (err) {
    console.error("❌ POST /api/appointments/:id/join-call error:", err);
    return res.status(500).json({ error: "Failed to join call" });
  }
});

/* ============================================================
   POST /api/appointments/:id/end-call
   Either party ends the call → callStatus = "ended"
   ============================================================ */
router.post("/:id/end-call", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const appointment = await getAppointmentWithUsers(id);

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const isDoctor = appointment.doctor?.user?.id === userId;
    const isPatient = appointment.patient?.user?.id === userId;
    const isStaff = ["PHYSICIAN_ASSISTANT", "ADMIN", "SUPERADMIN"].includes(req.user.role);

    if (!isDoctor && !isPatient && !isStaff) {
      return res.status(403).json({ error: "Not authorized to end this call" });
    }

    if (appointment.callStatus === "idle") {
      return res.status(400).json({ error: "No active call to end" });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { callStatus: "ended" },
    });

    return res.json({
      success: true,
      callStatus: updated.callStatus,
      message: "Call ended successfully",
    });
  } catch (err) {
    console.error("❌ POST /api/appointments/:id/end-call error:", err);
    return res.status(500).json({ error: "Failed to end call" });
  }
});

module.exports = router;
