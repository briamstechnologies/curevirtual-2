const express = require("express");
const router = express.Router();
const prisma = require("../prisma/prismaClient");
const { verifyToken, requireRole } = require("../middleware/rbac");
const { parseAsLocal } = require("../utils/timeUtils");

// Middleware
router.use(verifyToken);

// Helper: Check for time conflicts
function hasTimeConflict(start1, end1, start2, end2) {
  const toMinutes = (time) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const s1 = toMinutes(start1);
  const e1 = toMinutes(end1);
  const s2 = toMinutes(start2);
  const e2 = toMinutes(end2);

  return s1 < e2 && s2 < e1;
}

// =============================================================================
// DOCTOR: Manage Schedule (Recurring)
// =============================================================================

// GET /api/schedule?doctorId=...
router.get("/", async (req, res) => {
  try {
    const { doctorId } = req.query;
    if (!doctorId) return res.status(400).json({ error: "Doctor ID required" });

    // Try finding by userId first (common case), then id
    let doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: doctorId },
    });
    if (!doctorProfile)
      doctorProfile = await prisma.doctorProfile.findUnique({
        where: { id: doctorId },
      });

    // If we can't find a doctor profile, return empty array gracefully
    if (!doctorProfile) return res.json({ success: true, data: [] });

    const schedules = await prisma.doctorSchedule.findMany({
      where: { doctorId: doctorProfile.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    res.json({ success: true, data: schedules });
  } catch (err) {
    console.error("Error fetching schedule:", err);
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
});

// POST /api/schedule
router.post("/", async (req, res) => {
  try {
    const { doctorId, dayOfWeek, startTime, endTime } = req.body;

    if (!doctorId || dayOfWeek === undefined || !startTime || !endTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: doctorId },
    });
    if (!doctorProfile)
      doctorProfile = await prisma.doctorProfile.findUnique({
        where: { id: doctorId },
      });
    if (!doctorProfile) return res.status(404).json({ error: "Doctor profile not found" });

    // Check conflicts
    const existing = await prisma.doctorSchedule.findMany({
      where: {
        doctorId: doctorProfile.id,
        dayOfWeek: parseInt(dayOfWeek),
        isActive: true,
      },
    });

    for (const slot of existing) {
      if (hasTimeConflict(startTime, endTime, slot.startTime, slot.endTime)) {
        return res.status(409).json({
          error: `Conflict with existing slot: ${slot.startTime}-${slot.endTime}`,
        });
      }
    }

    const schedule = await prisma.doctorSchedule.create({
      data: {
        doctorId: doctorProfile.id,
        dayOfWeek: parseInt(dayOfWeek),
        startTime,
        endTime,
        slotDuration: 15,
        isActive: true,
      },
    });

    res.json({ success: true, data: schedule });
  } catch (err) {
    console.error("Error creating schedule:", err);
    res.status(500).json({ error: "Failed to create schedule" });
  }
});

// PATCH /api/schedule/:id
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    // We should ideally check conflicts here too if times are changing.
    // For now assuming simple toggle or update without complex validation for brevity,
    // but in production add conflict check.

    const updated = await prisma.doctorSchedule.update({
      where: { id },
      data: req.body,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to update schedule" });
  }
});

// DELETE /api/schedule/:id
router.delete("/:id", async (req, res) => {
  try {
    await prisma.doctorSchedule.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

// =============================================================================
// PATIENT: View Slots & Book
// =============================================================================

// GET /api/schedule/slots?doctorId=...&date=YYYY-MM-DD
const { formatInTimeZone, toDate, fromZonedTime, toZonedTime } = require("date-fns-tz");
const { parseISO, addMinutes, startOfDay, endOfDay } = require("date-fns");

router.get("/slots", async (req, res) => {
  try {
    const { doctorId, date } = req.query; // date is YYYY-MM-DD
    if (!doctorId || !date) return res.status(400).json({ error: "Missing params" });

    let doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: doctorId },
    });
    if (!doctorProfile)
      doctorProfile = await prisma.doctorProfile.findUnique({
        where: { id: doctorId },
      });
    if (!doctorProfile) return res.status(404).json({ error: "Doctor not found" });

    const doctorTz = doctorProfile.timezone || "UTC";

    // ✅ DIAGNOSTIC: Log raw data for timezone troubleshooting
    console.log(`\n--- [TIMEZONE DEBUG] ---`);
    console.log(`Doctor ID: ${doctorProfile.id}`);
    console.log(`Doctor Stored TZ: ${doctorProfile.timezone}`);
    console.log(`Resolved TZ to use: ${doctorTz}`);
    console.log(`Requested Date: ${date}`);

    // 1. Map the selected 'date' (YYYY-MM-DD) to the start/end of that day in DOCTOR'S time
    const startOfDoctorDayUTC = fromZonedTime(`${date} 00:00:00`, doctorTz);
    const endOfDoctorDayUTC = fromZonedTime(`${date} 23:59:59.999`, doctorTz);

    console.log(`Doctor Day (UTC Range): ${startOfDoctorDayUTC.toISOString()} -> ${endOfDoctorDayUTC.toISOString()}`);

    // Get rules for this day of week in DOCTOR'S timezone
    // toZonedTime ensures .getDay() returns the day number (0-6) relative to doc's time
    const docLocalTime = toZonedTime(startOfDoctorDayUTC, doctorTz);
    const dayOfWeek = docLocalTime.getDay();
    console.log(`Resolved DayOfWeek in Doctor TZ: ${dayOfWeek}`);

    const rules = await prisma.doctorSchedule.findMany({
      where: {
        doctorId: doctorProfile.id,
        dayOfWeek: dayOfWeek,
        isActive: true,
      },
    });

    console.log(`Found ${rules.length} recurring rules for this day.`);

    if (rules.length === 0) return res.json({ success: true, data: [] });

    // Get Appointments for this day (UTC range)
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctorProfile.id,
        appointmentDate: {
          gte: startOfDoctorDayUTC,
          lte: endOfDoctorDayUTC,
        },
        status: { not: "CANCELLED" },
      },
    });

    const bookedSet = new Set(existingAppointments.map((a) => a.appointmentDate.toISOString()));
    console.log(`Found ${existingAppointments.length} existing appointments.`);

    // Generate Slots
    let slots = [];
    for (const rule of rules) {
      console.log(`Applying rule: ${rule.startTime} - ${rule.endTime}`);
      // rule.startTime/endTime are "HH:MM" (doctor's local time)
      // Convert these to UTC for the specific date
      const startSlotUTC = fromZonedTime(`${date} ${rule.startTime}:00`, doctorTz);
      const endSlotUTC = fromZonedTime(`${date} ${rule.endTime}:00`, doctorTz);
      
      console.log(`  -> UTC Slot Boundary: ${startSlotUTC.toISOString()} - ${endSlotUTC.toISOString()}`);

      let current = startSlotUTC;
      while (current < endSlotUTC) {
        const next = addMinutes(current, rule.slotDuration || 15);
        if (next > endSlotUTC) break;

        const iso = current.toISOString();
        const isBooked = bookedSet.has(iso);

        slots.push({
          id: iso,
          startTime: iso,
          endTime: next.toISOString(),
          status: isBooked ? "BOOKED" : "AVAILABLE",
        });

        current = next;
      }
    }

    console.log(`Generated ${slots.length} total slots.`);
    console.log(`--- [END DEBUG] ---\n`);

    slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    res.json({ success: true, data: slots });
  } catch (err) {
    console.error("Slot generation error:", err);
    res.status(500).json({ error: "Failed to generate slots" });
  }
});

// POST /api/schedule/book
router.post("/book", async (req, res) => {
  try {
    const { doctorId, patientId, startTime, reason } = req.body; // startTime is an ISO string

    if (!doctorId || !patientId || !startTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Resolve Profiles
    let doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: doctorId },
    });
    if (!doctorProfile)
      doctorProfile = await prisma.doctorProfile.findUnique({
        where: { id: doctorId },
      });
    if (!doctorProfile) return res.status(404).json({ error: "Doctor not found" });

    let patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: patientId },
    });
    if (!patientProfile) {
      patientProfile = await prisma.patientProfile.findUnique({
        where: { id: patientId },
      });
    }

    // Auto-create profile if missing
    if (!patientProfile) {
      const user = await prisma.user.findUnique({
        where: { id: patientId },
      });
      if (user && user.role === "PATIENT") {
        const { ensureDefaultProfile } = require("../lib/provisionProfile");
        patientProfile = await ensureDefaultProfile(user);
      }
    }

    if (!patientProfile) return res.status(404).json({ error: "Patient profile not found" });
    
    // startTime is a UTC ISO string from the frontend
    const startDate = new Date(startTime);
    if (isNaN(startDate.getTime())) return res.status(400).json({ error: "Invalid start time" });

    // Check if slot is still available (concurrency check)
    const conflict = await prisma.appointment.findFirst({
      where: {
        doctorId: doctorProfile.id,
        appointmentDate: startDate,
        status: { not: "CANCELLED" },
      },
    });

    if (conflict) {
      return res.status(409).json({ error: "Slot already booked" });
    }

    const appointment = await prisma.appointment.create({
      data: {
        doctorId: doctorProfile.id,
        patientId: patientProfile.id,
        appointmentDate: startDate,
        startTime: startDate,
        endTime: new Date(startDate.getTime() + 15 * 60000),
        reason,
        status: "APPROVED",
      },
    });

    res.json({ success: true, appointment });
  } catch (err) {
    console.error("Booking error:", err);
    res.status(500).json({ error: "Booking failed" });
  }
});

module.exports = router;
