// FILE: backend/routes/videocall.js
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const prisma = require("../prisma/prismaClient");
const { verifyToken } = require("../middleware/rbac.js");
const { generateAgoraToken } = require("../lib/agoraToken.js");

/* ============================
   Agora Token Generation
============================ */
router.get("/agora-token", verifyToken, (req, res) => {
  try {
    const { channelName, uid } = req.query;
    if (!channelName) {
      return res.status(400).json({ error: "channelName is required" });
    }
    
    // We treat the uid as a string because we use alphanumeric strings for unique User IDs
    const token = generateAgoraToken(channelName, String(uid || req.user.id));
    res.json({ token, channelName, uid: String(uid || req.user.id) });
  } catch (err) {
    console.error("❌ GET /agora-token error:", err);
    res.status(500).json({ error: "Failed to generate Agora token" });
  }
});

/* ============================
   Helpers: Profile Resolution
============================ */
async function resolveDoctorProfileId({ doctorId, doctorUserId, callerUserId, role }) {
  // Prefer explicit DoctorProfile.id
  if (doctorId) {
    const d = await prisma.doctorProfile.findUnique({
      where: { id: String(doctorId) },
      select: { id: true },
    });
    if (d) return d.id;
    // If not found as profile, try as Doctor User.id
    const dByUser = await prisma.doctorProfile.findUnique({
      where: { userId: String(doctorId) },
      select: { id: true },
    });
    if (dByUser) return dByUser.id;
  }

  // doctorUserId explicitly provided
  if (doctorUserId) {
    const d = await prisma.doctorProfile.findUnique({
      where: { userId: String(doctorUserId) },
      select: { id: true },
    });
    if (d) return d.id;
  }

  // If caller is a doctor, infer from callerUserId
  if (role === "DOCTOR" && callerUserId) {
    const d = await prisma.doctorProfile.findUnique({
      where: { userId: String(callerUserId) },
      select: { id: true },
    });
    if (d) return d.id;
  }

  return null;
}

async function resolvePatientProfileId({ patientId, patientUserId, callerUserId, role }) {
  // Prefer explicit PatientProfile.id
  if (patientId) {
    const p = await prisma.patientProfile.findUnique({
      where: { id: String(patientId) },
      select: { id: true },
    });
    if (p) return p.id;
    // If not found as profile, try as Patient User.id
    const pByUser = await prisma.patientProfile.findUnique({
      where: { userId: String(patientId) },
      select: { id: true },
    });
    if (pByUser) return pByUser.id;
  }

  // patientUserId explicitly provided
  if (patientUserId) {
    const p = await prisma.patientProfile.findUnique({
      where: { userId: String(patientUserId) },
      select: { id: true },
    });
    if (p) return p.id;
  }

  // If caller is a patient, infer from callerUserId
  if (role === "PATIENT" && callerUserId) {
    const p = await prisma.patientProfile.findUnique({
      where: { userId: String(callerUserId) },
      select: { id: true },
    });
    if (p) return p.id;
  }

  return null;
}

/* ==========================================
   1) CREATE / SCHEDULE A VIDEO CONSULTATION
   POST /api/videocall/create
   Body (flexible):
     role: "DOCTOR" | "PATIENT"
     userId: <caller User.id>
     doctorId: DoctorProfile.id OR Doctor User.id
     doctorUserId?: Doctor User.id (alt)
     patientId: PatientProfile.id OR Patient User.id
     patientUserId?: Patient User.id (alt)
     scheduledAt: ISO
     durationMins?: number
     title?, notes? (optional, ignored for now)
========================================== */
router.post("/create", verifyToken, async (req, res) => {
  try {
    const {
      role,
      userId, // caller
      doctorId,
      doctorUserId,
      patientId,
      patientUserId,
      scheduledAt,
      durationMins,
    } = req.body || {};

    if (!scheduledAt) {
      return res.status(400).json({ error: "scheduledAt is required" });
    }
    const when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime())) {
      return res.status(400).json({ error: "scheduledAt is not a valid date" });
    }

    const callerUserId = userId;

    // Resolve both sides to Profile IDs, regardless of which IDs were provided
    const doctorProfileId = await resolveDoctorProfileId({
      doctorId,
      doctorUserId,
      callerUserId,
      role,
    });
    const patientProfileId = await resolvePatientProfileId({
      patientId,
      patientUserId,
      callerUserId,
      role,
    });

    if (!doctorProfileId || !patientProfileId) {
      return res.status(400).json({
        error: "doctorId and patientId must resolve to valid profiles",
        details: { doctorProfileId, patientProfileId },
      });
    }

    const created = await prisma.videoConsultation.create({
      data: {
        doctorId: doctorProfileId,
        patientId: patientProfileId,
        scheduledAt: when,
        durationMins: Number(durationMins) || 30,
        status: "SCHEDULED",
      },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
    });

    return res.status(201).json({ success: true, data: created });
  } catch (e) {
    console.error("POST /videocall/create error:", e);
    return res.status(500).json({ error: "Failed to create consultation" });
  }
});

/* ==========================================
   2) LIST CONSULTATIONS (Doctor or Patient)
   GET /api/videocall/list?userId=...&role=DOCTOR|PATIENT
========================================== */
router.get("/list", verifyToken, async (req, res) => {
  try {
    const { userId, role } = req.query;

    if (!userId || !role) {
      return res.status(400).json({ error: "userId and role are required" });
    }

    let filter = {};

    if (role === "DOCTOR") {
      const doc = await prisma.doctorProfile.findUnique({
        where: { userId: String(userId) },
        select: { id: true },
      });
      if (!doc) return res.json({ success: true, data: [] });
      filter.doctorId = doc.id;
    } else if (role === "PATIENT") {
      const pat = await prisma.patientProfile.findUnique({
        where: { userId: String(userId) },
        select: { id: true },
      });
      if (!pat) return res.json({ success: true, data: [] });
      filter.patientId = pat.id;
    } else {
      return res.status(400).json({ error: "Invalid role" });
    }

    const consults = await prisma.videoConsultation.findMany({
      where: filter,
      orderBy: { scheduledAt: "desc" },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
    });

    // ✅ ALSO: Fetch standard Appointments that are NOT idle (meaning a call is requested or active)
    let appointmentFilter = {};
    if (role === "DOCTOR") {
      const doc = await prisma.doctorProfile.findUnique({
        where: { userId: String(userId) },
        select: { id: true },
      });
      if (doc) appointmentFilter.doctorId = doc.id;
    } else {
      const pat = await prisma.patientProfile.findUnique({
        where: { userId: String(userId) },
        select: { id: true },
      });
      if (pat) appointmentFilter.patientId = pat.id;
    }

    // Only show appointments that are confirmed/scheduled and NOT idle or ended
    appointmentFilter.callStatus = { in: ["requested", "active"] };

    const activeAppointments = await prisma.appointment.findMany({
      where: appointmentFilter,
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
    });

    // Map appointments to fit the consultation shape for the mobile frontend
    const mappedAppointments = activeAppointments.map(app => ({
      ...app,
      scheduledAt: app.appointmentDate,
      isAppointment: true, // Flag for frontend
    }));

    // Combine and sort
    const combined = [...consults, ...mappedAppointments].sort(
      (a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt)
    );

    return res.json({ success: true, data: combined });
  } catch (err) {
    console.error("❌ Error fetching combined consultations:", err);
    return res.status(500).json({ error: "Failed to fetch consultations" });
  }
});

/* ==========================================
   3) GENERATE ZEGO ROOM NAME
   Returns a unique, secure room name for ZEGO
========================================== */
router.post("/room-name", verifyToken, async (req, res) => {
  try {
    // ✅ Generate a ZEGO-safe room name (alphanumeric only, no hyphens)
    const roomName = `consult${crypto.randomUUID().replace(/-/g, '')}`;
    return res.json({ success: true, roomName });
  } catch (err) {
    console.error("❌ Error generating room name:", err);
    return res.status(500).json({ error: "Failed to generate room name" });
  }
});

/* ==========================================
   4) UPDATE STATUS
   PUT /api/videocall/status/:id
   Body: { status: "SCHEDULED"|"ONGOING"|"COMPLETED"|"CANCELLED" }
========================================== */
router.put("/status/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, failureReason, recordingUrl } = req.body || {};

    const valid = ["SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED", "FAILED"];
    if (!valid.includes(String(status))) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const updateData = { status: String(status) };

    if (status === "ONGOING") {
      updateData.actualStartTime = new Date();
    } else if (status === "COMPLETED" || status === "CANCELLED" || status === "FAILED") {
      updateData.actualEndTime = new Date();
    }

    if (failureReason) {
      updateData.failureReason = failureReason;
    }
    if (recordingUrl) {
      updateData.recordingUrl = recordingUrl;
    }

    const updated = await prisma.videoConsultation.update({
      where: { id: String(id) },
      data: updateData,
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("❌ Error updating consultation status:", err);
    return res.status(500).json({ error: "Failed to update consultation" });
  }
});

/* ==========================================
   5) CANCEL (soft status update)
   PATCH /api/videocall/cancel/:id
========================================== */
router.patch("/cancel/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const cancelled = await prisma.videoConsultation.update({
      where: { id: String(id) },
      data: { status: "CANCELLED" },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
    });
    return res.json({ success: true, data: cancelled });
  } catch (err) {
    console.error("❌ Error cancelling consultation:", err);
    return res.status(500).json({ error: "Failed to cancel consultation" });
  }
});

/* ==========================================
   6) RESCHEDULE
   PATCH /api/videocall/reschedule/:id
   Body: { scheduledAt?, durationMins? }
========================================== */
router.patch("/reschedule/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledAt, durationMins } = req.body || {};
    if (!scheduledAt && durationMins == null) {
      return res.status(400).json({ error: "Provide scheduledAt and/or durationMins" });
    }

    const data = {};
    if (scheduledAt) {
      const when = new Date(scheduledAt);
      if (Number.isNaN(when.getTime())) {
        return res.status(400).json({ error: "scheduledAt is not a valid date" });
      }
      data.scheduledAt = when;
    }
    if (durationMins != null) {
      data.durationMins = Number(durationMins);
    }

    const updated = await prisma.videoConsultation.update({
      where: { id: String(id) },
      data,
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("❌ Error rescheduling consultation:", err);
    return res.status(500).json({ error: "Failed to reschedule consultation" });
  }
});

/* ==========================================
   7) UPDATE CONSULTATION DETAILS (EDIT)
   PUT /api/videocall/:id
========================================== */
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledAt, durationMins, notes, status, title } = req.body || {};

    const existing = await prisma.videoConsultation.findUnique({
      where: { id: String(id) },
    });
    if (!existing) {
      return res.status(404).json({ error: "Consultation not found" });
    }

    const data = {};
    if (scheduledAt) {
      const when = new Date(scheduledAt);
      if (!Number.isNaN(when.getTime())) {
        data.scheduledAt = when;
      }
    }
    if (durationMins != null && !isNaN(Number(durationMins))) {
      data.durationMins = Number(durationMins);
    }
    if (notes !== undefined) {
      data.notes = notes;
    }
    if (title !== undefined) {
      data.title = title;
    }
    if (status) {
      const valid = ["SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED", "FAILED"];
      if (valid.includes(String(status).toUpperCase())) {
        data.status = String(status).toUpperCase();
      }
    }

    const updated = await prisma.videoConsultation.update({
      where: { id: String(id) },
      data,
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("❌ Error updating consultation:", err);
    return res.status(500).json({ error: err.message || "Failed to update consultation" });
  }
});

/* ==========================================
   8) DELETE CONSULTATION
   DELETE /api/videocall/:id
========================================== */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.videoConsultation.findUnique({
      where: { id: String(id) },
    });
    if (!existing) {
      return res.status(404).json({ error: "Consultation not found" });
    }

    // If ONGOING, emit socket termination event to end call on both ends
    if (existing.status === "ONGOING") {
      try {
        const io = req.app?.get("io");
        if (io) {
          const roomName = existing.roomName || `consult_${id}`;
          io.emit("call:terminated", {
            consultationId: id,
            roomName,
            reason: "Consultation deleted by doctor",
          });
          io.to(roomName).emit("call:terminated", {
            consultationId: id,
            roomName,
            reason: "Consultation deleted by doctor",
          });
        }
      } catch (socketErr) {
        console.warn("Notice: socket emit on delete ongoing consultation:", socketErr?.message);
      }
    }

    await prisma.videoConsultation.delete({
      where: { id: String(id) },
    });

    return res.json({ success: true, message: "Consultation deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting consultation:", err);
    return res.status(500).json({ error: err.message || "Failed to delete consultation" });
  }
});

module.exports = router;
