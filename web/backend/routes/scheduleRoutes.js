const express = require("express");
const router = express.Router();
const prisma = require("../prisma/prismaClient");
const { verifyToken } = require("../middleware/rbac");
const { fromZonedTime, toZonedTime } = require("date-fns-tz");
const { addMinutes } = require("date-fns");

const DEFAULT_TIMEZONE = "Asia/Karachi";

// Middleware
router.use(verifyToken);
const paAccessControl = require("../middleware/paAccessControl");
router.use(paAccessControl("canAccessMySchedule"));

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

// Helper: Resolve doctor profile for Doctor or PA
async function resolveScheduleDoctorProfile(userIdOrProfileId) {
  let profile = await prisma.doctorProfile.findUnique({
    where: { userId: userIdOrProfileId },
  });
  if (profile) return profile;

  profile = await prisma.doctorProfile.findUnique({
    where: { id: userIdOrProfileId },
  });
  if (profile) return profile;

  const pa = await prisma.physicianAssistantProfile.findUnique({
    where: { userId: userIdOrProfileId },
    include: {
      assignments: {
        where: { assignmentStatus: "ACTIVE" },
        include: { doctor: true }
      }
    }
  });
  if (pa && pa.assignments.length > 0) {
    return pa.assignments[0].doctor;
  }
  return null;
}

// =============================================================================
// DOCTOR: Manage Schedule (Recurring)
// =============================================================================

// GET /api/schedule?doctorId=...
router.get("/", async (req, res) => {
  try {
    const { doctorId } = req.query;
    if (!doctorId) return res.status(400).json({ error: "Doctor ID required" });

    const doctorProfile = await resolveScheduleDoctorProfile(doctorId);

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

    const doctorProfile = await resolveScheduleDoctorProfile(doctorId);
    if (!doctorProfile) return res.status(404).json({ error: "Doctor profile not found" });

    // 🔧 UTC CONVERSION LOGIC (Fixed for "Always Store UTC")
    const doctorTz = doctorProfile.timezone || DEFAULT_TIMEZONE;
    
    // Create a dummy date to perform the shift
    const dummyDate = "2024-01-01"; // Monday
    const localStartStr = `${dummyDate} ${startTime}:00`;
    const localEndStr = `${dummyDate} ${endTime}:00`;
    
    const utcStartDate = fromZonedTime(localStartStr, doctorTz);
    const utcEndDate = fromZonedTime(localEndStr, doctorTz);

    // Calculate shifts relative to dummy Monday (2024-01-01)
    // getUTCDay() returns 1 for Monday
    const dayShift = utcStartDate.getUTCDay() - 1; 
    const newDayOfWeek = (parseInt(dayOfWeek) + dayShift + 7) % 7;
    
    const pad = (n) => String(n).padStart(2, "0");
    const utcStartFormatted = `${pad(utcStartDate.getUTCHours())}:${pad(utcStartDate.getUTCMinutes())}`;
    const utcEndFormatted = `${pad(utcEndDate.getUTCHours())}:${pad(utcEndDate.getUTCMinutes())}`;

    console.log(`[Schedule DEBUG] Doctor (${doctorTz}) local: ${startTime}-${endTime} (Day ${dayOfWeek}) -> UTC: ${utcStartFormatted}-${utcEndFormatted} (Day ${newDayOfWeek})`);

    // Check conflicts (now using UTC values for comparison)
    const existing = await prisma.doctorSchedule.findMany({
      where: {
        doctorId: doctorProfile.id,
        dayOfWeek: newDayOfWeek,
        isActive: true,
      },
    });

    for (const slot of existing) {
      if (hasTimeConflict(utcStartFormatted, utcEndFormatted, slot.startTime, slot.endTime)) {
        return res.status(409).json({
          error: `Conflict with existing slot: ${slot.startTime}-${slot.endTime} (UTC)`,
        });
      }
    }

    const schedule = await prisma.doctorSchedule.create({
      data: {
        doctorId: doctorProfile.id,
        dayOfWeek: newDayOfWeek,
        startTime: utcStartFormatted,
        endTime: utcEndFormatted,
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
    const { startTime, endTime, dayOfWeek } = req.body;

    // If times are updating, we need to convert them to UTC
    if (startTime || endTime || dayOfWeek !== undefined) {
      const scheduleRecord = await prisma.doctorSchedule.findUnique({
        where: { id },
        include: { doctor: true }
      });
      
      const doctorTz = scheduleRecord.doctor.timezone || DEFAULT_TIMEZONE;
      const targetStartTime = startTime || scheduleRecord.startTime;
      const targetEndTime = endTime || scheduleRecord.endTime;
      const targetDay = dayOfWeek !== undefined ? dayOfWeek : scheduleRecord.dayOfWeek;

      const dummyDate = "2024-01-01"; // Monday
      const utcStartDate = fromZonedTime(`${dummyDate} ${targetStartTime}:00`, doctorTz);
      const utcEndDate = fromZonedTime(`${dummyDate} ${targetEndTime}:00`, doctorTz);

      const dayShift = utcStartDate.getUTCDay() - 1;
      req.body.dayOfWeek = (parseInt(targetDay) + dayShift + 7) % 7;
      
      const pad = (n) => String(n).padStart(2, "0");
      req.body.startTime = `${pad(utcStartDate.getUTCHours())}:${pad(utcStartDate.getUTCMinutes())}`;
      req.body.endTime = `${pad(utcEndDate.getUTCHours())}:${pad(utcEndDate.getUTCMinutes())}`;
      
      console.log(`[Schedule DEBUG] Update: Local Day ${targetDay} ${targetStartTime} -> UTC Day ${req.body.dayOfWeek} ${req.body.startTime}`);
    }

    const updated = await prisma.doctorSchedule.update({
      where: { id },
      data: req.body,
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating schedule:", error);
    res.status(500).json({ error: "Failed to update schedule" });
  }
});

// DELETE /api/schedule/:id
router.delete("/:id", async (req, res) => {
  try {
    await prisma.doctorSchedule.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete" });
  }
});

// =============================================================================
// PATIENT: View Slots & Book
// =============================================================================

// GET /api/schedule/slots?doctorId=...&date=YYYY-MM-DD
router.get("/slots", async (req, res) => {
  try {
    const { doctorId, date } = req.query; // date is YYYY-MM-DD
    
    // 1. Strict Input Validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!doctorId || !date || !dateRegex.test(date)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid or missing parameters. Required: doctorId (UUID/ID), date (YYYY-MM-DD)" 
      });
    }

    const checkDate = new Date(date);
    if (isNaN(checkDate.getTime())) {
      return res.status(400).json({ success: false, error: "Invalid date value" });
    }

    const doctorProfile = await resolveScheduleDoctorProfile(doctorId);
    if (!doctorProfile) return res.status(404).json({ success: false, error: "Doctor not found" });

    const doctorTz = doctorProfile.timezone || DEFAULT_TIMEZONE;

    // 1. Map the selected 'date' (YYYY-MM-DD) to the start/end of that day in DOCTOR'S time
    const startOfDoctorDayUTC = fromZonedTime(`${date} 00:00:00`, doctorTz);
    const endOfDoctorDayUTC = fromZonedTime(`${date} 23:59:59.999`, doctorTz);

    // Get rules for this day of week in DOCTOR'S timezone
    // toZonedTime ensures .getDay() returns the day number (0-6) relative to doc's time
    const docLocalTime = toZonedTime(startOfDoctorDayUTC, doctorTz);
    const dayOfWeek = docLocalTime.getDay();

    const rules = await prisma.doctorSchedule.findMany({
      where: {
        doctorId: doctorProfile.id,
        dayOfWeek: dayOfWeek,
        isActive: true,
      },
    });

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

    // Generate Slots
    let slots = [];
    for (const rule of rules) {
      // rule.startTime/endTime are ALREADY UTC in the database now.
      // We just need to combine them with the requested 'date'.
      
      // ✅ FIX: Do NOT call fromZonedTime here. The values are already UTC.
      // We just ensure they are formatted as a proper ISO string.
      const startSlotUTC = new Date(`${date}T${rule.startTime}:00.000Z`);
      let endSlotUTC = new Date(`${date}T${rule.endTime}:00.000Z`);

      // 🕒 FIX: If the end time is less than or equal to start time (e.g. 00:00), 
      // it means it crossed midnight into the next day.
      if (endSlotUTC <= startSlotUTC) {
        endSlotUTC = new Date(endSlotUTC.getTime() + 24 * 60 * 60 * 1000); // add 1 day
      }

      console.log(`[Slot DEBUG] Rule: ${rule.startTime}-${rule.endTime} (UTC) -> Generating for ${date}`);

      let current = startSlotUTC;
      let iterationSafety = 0;
      const slotSize = rule.slotDuration && rule.slotDuration > 0 ? rule.slotDuration : 15;

      while (current < endSlotUTC && iterationSafety < 500) {
        iterationSafety++;
        const next = addMinutes(current, slotSize);
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

    slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    res.json({ success: true, data: slots });
  } catch (err) {
    // 3. Structured Error Logging
    console.error(`❌ [/api/schedule/slots] Critical failure:`, {
      message: err.message,
      stack: err.stack,
      context: {
        query: req.query,
        timestamp: new Date().toISOString(),
      }
    });
    res.status(500).json({ success: false, error: "Internal Server Error during slot generation" });
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
    const doctorProfile = await resolveScheduleDoctorProfile(doctorId);
    if (!doctorProfile) return res.status(404).json({ error: "Doctor not found" });

    let patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: patientId },
    });
    if (!patientProfile)
      patientProfile = await prisma.patientProfile.findUnique({
        where: { id: patientId },
      });
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
        status: "PENDING",
      },
    });

    res.json({ success: true, appointment });
  } catch (err) {
    console.error("Booking error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
