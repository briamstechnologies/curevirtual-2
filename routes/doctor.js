const express = require("express");
const { verifyToken, requireRole } = require("../middleware/rbac.js");

const prisma = require("../prisma/prismaClient");
const emailService = require("../services/emailService");
const { parseAsLocal } = require("../utils/timeUtils");
const { ensureDefaultProfile } = require("../lib/provisionProfile.js");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");

// Setup Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Setup Multer with Memory Storage
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Apply RBAC to all doctor routes
router.use(verifyToken);
router.use(requireRole(["DOCTOR", "PHYSICIAN_ASSISTANT", "SUPERADMIN", "ADMIN"]));

/**
 * GET /api/doctor/waiting-patients?doctorId=<User.id>
 * Returns patients currently waiting or checked in.
 */
router.get("/waiting-patients", async (req, res) => {
  try {
    const doctorUserId = req.query.doctorId || req.user?.id;
    if (!doctorUserId) return res.status(400).json({ error: "doctorId is required" });

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: doctorUserId },
      select: { id: true },
    });
    if (!doctorProfile) return res.json([]);

    const waiting = await prisma.appointment.findMany({
      where: {
        doctorId: doctorProfile.id,
        status: { in: ["CHECKED_IN", "WAITING"] },
      },
      include: {
        patient: { include: { user: true } },
      },
      orderBy: { appointmentDate: "asc" },
    });

    return res.json(waiting);
  } catch (err) {
    console.error("waiting-patients error:", err);
    return res.status(500).json({ error: "Failed to fetch waiting patients" });
  }
});

/**
 * GET /api/doctor/stats?doctorId=<User.id>
 * Returns dashboard stats for a doctor.
 */
router.get("/stats", async (req, res) => {
  try {
    const doctorUserId = req.query.doctorId || req.user?.id;
    if (!doctorUserId) {
      return res.status(400).json({ error: "doctorId (User.id) is required" });
    }

    // Resolve the DoctorProfile (most relations use DoctorProfile.id)
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: doctorUserId },
      select: { id: true },
    });

    // If no profile, return zeroed stats (prevents 500s on new accounts)
    if (!doctorProfile) {
      return res.json({
        totalAppointments: 0,
        completedAppointments: 0,
        pendingAppointments: 0,
        totalPrescriptions: 0,
        totalMessages: await prisma.message.count({
          where: {
            OR: [{ senderId: doctorUserId }, { receiverId: doctorUserId }],
          },
        }),
        activePatients: 0,
      });
    }

    const dpId = doctorProfile.id;

    // Queries in parallel for speed
    const [
      totalAppointments,
      completedAppointments,
      pendingAppointments,
      totalPrescriptions,
      totalMessages,
      distinctPatients,
    ] = await Promise.all([
      prisma.appointment.count({
        where: { doctorId: dpId },
      }),
      prisma.appointment.count({
        where: { doctorId: dpId, status: "COMPLETED" },
      }),
      prisma.appointment.count({
        where: { doctorId: dpId, status: "PENDING" },
      }),
      prisma.prescription.count({
        where: { doctorId: dpId },
      }),
      prisma.message.count({
        where: {
          OR: [{ senderId: doctorUserId }, { receiverId: doctorUserId }],
        },
      }),
      // Distinct patients this doctor has appointments with
      prisma.appointment.findMany({
        where: { doctorId: dpId },
        distinct: ["patientId"],
        select: { patientId: true },
      }),
    ]);

    const activePatients = distinctPatients.length;

    // Enhanced stats for Dashboard
    const [urgentLabs, unsignedNotes, lateAppointments] = await Promise.all([
      prisma.labOrder.count({
        where: { doctorId: dpId, status: "ORDERED" },
      }),
      prisma.clinicalEncounter.count({
        where: { doctorId: dpId, status: "DRAFT" },
      }),
      prisma.appointment.count({
        where: {
          doctorId: dpId,
          status: { in: ["WAITING", "CHECKED_IN"] },
          appointmentDate: { lt: new Date() },
        },
      }),
    ]);

    return res.json({
      totalAppointments,
      completedAppointments,
      pendingAppointments,
      totalPrescriptions,
      totalMessages,
      activePatients,
      urgentFlags: {
        urgentLabs,
        unsignedNotes,
        lateAppointments,
      },
    });
  } catch (err) {
    console.error("❌ /api/doctor/stats error:", err);
    return res.status(500).json({ error: "Failed to fetch doctor stats" });
  }
});

/*================================================================
// ✅ GET /api/doctor/profile?userId=xxxx
==================================================================*/

// GET /api/doctor/profile?userId=...
router.get("/profile", async (req, res) => {
  try {
    const userId = req.query.userId || req.user?.id;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    let profile = await prisma.doctorProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            gender: true,
            maritalStatus: true,
            profileImage: true,
          },
        },
      },
    });
    if (!profile && user.role === "DOCTOR") {
      profile = await ensureDefaultProfile(user);
    }

    if (!profile) return res.status(404).json({ error: "Profile not found" });

    return res.json({ data: profile });
  } catch (e) {
    console.error("❌ doctor profile GET error:", e);
    return res.status(500).json({ error: "Failed to load profile" });
  }
});

// PUT /api/doctor/profile (upsert)
router.put("/profile", upload.single("profileImage"), async (req, res) => {
  console.log("--- MULTIPART REQUEST ARRIVED ---");
  console.log("req.file:", req.file);
  console.log("req.body:", req.body);
  
  try {
    const {
      userId,
      firstName, 
      middleName,
      lastName, 
      phone, 
      specialization,
      customProfession,
      qualifications,
      licenseNumber,
      hospitalAffiliation,
      yearsOfExperience,
      consultationFee,
      availability, 
      timezone, 
      bio,
      languages, 
      emergencyContact,
      emergencyContactName,
      emergencyContactEmail,
      maritalStatus
    } = req.body || {};

    if (!userId) return res.status(400).json({ error: "userId is required" });

    // ✅ Helper to securely parse fields from FormData string values
    function parseField(value, type) {
      if (value === undefined || value === "" || value === "null" || value === "undefined") return undefined;
      if (type === "int") return parseInt(value, 10);
      if (type === "float") return parseFloat(value);
      if (type === "json") { try { return JSON.parse(value); } catch { return value; } }
      if (type === "bool") return value === "true" || value === true;
      return value;
    }

    // ✅ Supabase Image Upload with Try/Catch
    let profileImageUrl;
    if (req.file) {
      try {
        const fileName = `${Date.now()}-${req.file.originalname}`;
        const { data, error } = await supabase.storage
          .from("avatars")
          .upload(fileName, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: true
          });

        if (error) throw error;

        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        profileImageUrl = publicUrlData.publicUrl;
      } catch (uploadError) {
        console.error("Supabase Upload Error:", uploadError);
        return res.status(500).json({ error: `Supabase Upload Failed: ${uploadError.message || "Unknown error"}` });
      }
    }

    // ✅ Prisma Database Update with Try/Catch
    try {
      const userData = {
        ...(parseField(firstName, "string") !== undefined && { firstName: parseField(firstName, "string") }),
        ...(parseField(middleName, "string") !== undefined && { middleName: parseField(middleName, "string") }),
        ...(parseField(lastName, "string") !== undefined && { lastName: parseField(lastName, "string") }),
        ...(parseField(phone, "string") !== undefined && { phone: parseField(phone, "string") }),
        ...(parseField(maritalStatus, "string") !== undefined && { maritalStatus: parseField(maritalStatus, "string") }),
        ...(profileImageUrl !== undefined && { profileImage: profileImageUrl }),
      };

      if (Object.keys(userData).length > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: userData,
        });
      }

      // Fields mapped perfectly to Prisma types for DoctorProfile
      const doctorData = {
        ...(parseField(specialization, "string") !== undefined && { specialization: parseField(specialization, "string") }),
        ...(parseField(customProfession, "string") !== undefined && { customProfession: parseField(customProfession, "string") }),
        ...(parseField(qualifications, "string") !== undefined && { qualifications: parseField(qualifications, "string") }),
        ...(parseField(licenseNumber, "string") !== undefined && { licenseNumber: parseField(licenseNumber, "string") }),
        ...(parseField(hospitalAffiliation, "string") !== undefined && { hospitalAffiliation: parseField(hospitalAffiliation, "string") }),
        ...(parseField(yearsOfExperience, "int") !== undefined && { yearsOfExperience: parseField(yearsOfExperience, "int") }),
        ...(parseField(consultationFee, "float") !== undefined && { consultationFee: parseField(consultationFee, "float") }),
        ...(parseField(availability, "string") !== undefined && { availability: parseField(availability, "string") }),
        ...(parseField(timezone, "string") !== undefined && { timezone: parseField(timezone, "string") }),
        ...(parseField(bio, "string") !== undefined && { bio: parseField(bio, "string") }),
        ...(parseField(languages, "string") !== undefined && { languages: parseField(languages, "string") }),
        ...(parseField(emergencyContact, "string") !== undefined && { emergencyContact: parseField(emergencyContact, "string") }),
        ...(parseField(emergencyContactName, "string") !== undefined && { emergencyContactName: parseField(emergencyContactName, "string") }),
        ...(parseField(emergencyContactEmail, "string") !== undefined && { emergencyContactEmail: parseField(emergencyContactEmail, "string") }),
      };

      await prisma.doctorProfile.upsert({
        where: { userId },
        update: doctorData,
        create: {
          userId,
          specialization: doctorData.specialization || "General Medicine",
          qualifications: doctorData.qualifications || "MBBS",
          licenseNumber: doctorData.licenseNumber || `LIC-${userId.slice(0, 8).toUpperCase()}`,
          ...doctorData, 
        },
      });

      const fullProfile = await prisma.doctorProfile.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              dateOfBirth: true,
              gender: true,
              maritalStatus: true,
              profileImage: true,
            },
          },
        },
      });

      return res.json({ data: fullProfile });
    } catch (prismaError) {
      console.error("Prisma Database Error:", prismaError);
      return res.status(500).json({ error: `Prisma Database Error: ${prismaError.message || "Unknown error"}` });
    }
  } catch (e) {
    console.error("❌ doctor profile PUT error:", e);
    return res.status(500).json({ error: `Server Error: ${e.message || "Unknown error"}` });
  }
});

// router.get("/profile", async (req, res) => {
//   try {
//     const { userId } = req.query;
//     if (!userId) return res.status(400).json({ error: "Missing userId" });

//     const doctorProfile = await prisma.doctorProfile.findUnique({
//       where: { userId },
//       include: {
//         user: { select: { id: true, firstName: true, lastName: true, email: true } },
//       },
//     });

//     if (!doctorProfile)
//       return res.status(404).json({ error: "Doctor profile not found" });

//     res.json(doctorProfile);
//   } catch (error) {
//     console.error("❌ Error fetching doctor profile:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

// GET /api/doctor/list
router.get("/list", async (_req, res) => {
  try {
    const list = await prisma.doctorProfile.findMany({
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(list);
  } catch (err) {
    console.error("❌ GET /api/doctor/list error:", err);
    res.status(500).json({ error: "Failed to load doctors" });
  }
});

/**
 * GET /api/doctor/my-patients?doctorId=<User.id>
 * Returns DISTINCT patients for this doctor (based on appointments).
 * Each patient includes User info.
 */
router.get("/my-patients", async (req, res) => {
  try {
    const doctorUserId = req.query.doctorId;
    if (!doctorUserId) {
      return res.status(400).json({ error: "doctorId (User.id) is required" });
    }

    // Resolve the doctor profile (DoctorProfile.id)
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: doctorUserId },
      select: { id: true },
    });

    if (!doctorProfile) {
      return res.json([]); // No profile yet → no patients
    }

    // Fetch all PatientProfiles + linked User so doctor can select any patient for new sessions
    const patients = await prisma.patientProfile.findMany({
      select: {
        id: true,
        bloodGroup: true,
        height: true,
        weight: true,
        allergies: true,
        medications: true,
        medicalHistory: true,
        address: true,
        emergencyContact: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            dateOfBirth: true,
            gender: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Shape a simple list for the table
    const result = patients.map((p) => ({
      id: p.id, // PatientProfile.id
      name: `${p.user?.firstName || ""} ${p.user?.lastName || ""}`.trim() || "Unknown",
      email: p.user?.email || "",
      gender: p.user?.gender || null,
      dateOfBirth: p.user?.dateOfBirth || null,
      bloodGroup: p.bloodGroup || null,
      // For modal (we can pass through the entire object)
      profile: p,
    }));

    return res.json(result);
  } catch (err) {
    console.error("❌ /api/doctor/my-patients error:", err);
    return res.status(500).json({ error: err.message, details: err.toString() });
  }
});

/**
 * GET /api/doctor/patient/:id
 * Returns full patient profile (by PatientProfile.id) with linked User.
 */
router.get("/patient/:id", async (req, res) => {
  try {
    const { id } = req.params; // PatientProfile.id
    const patient = await prisma.patientProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            createdAt: true,
          },
        },
      },
    });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }
    return res.json(patient);
  } catch (err) {
    console.error("❌ /api/doctor/patient/:id error:", err);
    return res.status(500).json({ error: "Failed to fetch patient" });
  }
});

//======================APPOINTMENTS=============================

// ======================================================
// 1️⃣ POST /api/doctor/appointment — Create Appointment
// ======================================================
router.post("/appointments", async (req, res) => {
  try {
    const { doctorId, patientId, appointmentDate, reason } = req.body;

    if (!doctorId || !patientId || !appointmentDate) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: doctorId },
    });
    if (!doctorProfile) {
      return res.status(404).json({ error: "Doctor profile not found" });
    }

    const patientProfile = await prisma.patientProfile.findUnique({
      where: { id: patientId },
    });
    if (!patientProfile) {
      return res.status(404).json({ error: "Patient profile not found" });
    }

    console.log("DEBUG: Creating appointment", { doctorId, patientId, appointmentDate });
    const localDate = parseAsLocal(appointmentDate);
    console.log("DEBUG: Parsed appointmentDate", {
      input: appointmentDate,
      stored: localDate.toISOString(),
    });

    const newAppointment = await prisma.appointment.create({
      data: {
        doctorId: doctorProfile.id,
        patientId: patientProfile.id,
        appointmentDate: localDate,
        reason,
      },
    });

    // Update with roomName
    await prisma.appointment.update({
      where: { id: newAppointment.id },
      data: { roomName: `appointment-${newAppointment.id}` },
    });

    const finalAppointment = await prisma.appointment.findUnique({
      where: { id: newAppointment.id },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
    });

    if (finalAppointment.doctor?.user && finalAppointment.patient?.user) {
      emailService
        .sendAppointmentBookingConfirmation(
          finalAppointment,
          finalAppointment.patient.user,
          finalAppointment.doctor.user
        )
        .catch((err) => console.error("Failed to send appointment emails:", err));
    }

    res.status(201).json(newAppointment);
  } catch (error) {
    console.error("❌ Error creating appointment:", error);
    res.status(500).json({ error: "Failed to create appointment" });
  }
});

// ======================================================
// 2️⃣ PATCH /api/doctor/appointment/:id — Update Appointment
// ======================================================
router.patch("/appointments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { appointmentDate, reason, status } = req.body;

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...(appointmentDate && { appointmentDate: parseAsLocal(appointmentDate) }),
        ...(reason && { reason }),
        ...(status && { status }),
      },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
    });

    if (status && updatedAppointment.patient?.user && updatedAppointment.doctor?.user) {
      emailService
        .sendAppointmentStatusChange(
          updatedAppointment,
          updatedAppointment.patient.user,
          updatedAppointment.doctor.user,
          status
        )
        .catch((err) => console.error("Failed to send appointment status email:", err));
    }

    res.json(updatedAppointment);
  } catch (error) {
    console.error("❌ Error updating appointment:", error);
    res.status(500).json({ error: "Failed to update appointment" });
  }
});

/* ======================================================
   2️⃣  GET /api/doctor/appointments — Fetch All
   ====================================================== */
router.get("/appointments", async (req, res) => {
  const doctorId = req.query.doctorId || req.user?.id; // doctorId = User.id

  console.log("DEBUG: GET /doctor/appointments", {
    query: req.query,
    user: req.user,
    resolvedDoctorId: doctorId,
  });

  if (!doctorId) return res.status(400).json({ error: "doctorId (User ID) is required" });

  try {
    // ✅ Find DoctorProfile using userId
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: doctorId },
    });

    if (!doctorProfile) return res.status(404).json({ error: "Doctor profile not found" });

    // ✅ Fetch all appointments for this doctor
    const appointments = await prisma.appointment.findMany({
      where: { doctorId: doctorProfile.id },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
      orderBy: { appointmentDate: "desc" },
    });

    res.json(appointments);
  } catch (err) {
    console.error("❌ Error fetching doctor appointments:", err);
    res.status(500).json({ error: "Failed to fetch doctor appointments" });
  }
});

/* ======================================================
   5️⃣  PATCH /api/doctor/appointments/:id/cancel — Cancel
   ====================================================== */
router.patch("/appointments/:id/cancel", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.appointment.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    res.json({ message: "Appointment cancelled" });
  } catch (err) {
    console.error("❌ Error cancelling appointment:", err);
    res.status(500).json({ error: "Failed to cancel appointment" });
  }
});

/* ======================================================
   🗑️  DELETE /api/doctor/appointment/:id
   ====================================================== */
router.delete("/appointments/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.appointment.delete({ where: { id } });

    res.json({ message: "Appointment deleted" });
  } catch (error) {
    console.error("❌ Error deleting appointment:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Appointment not found" });
    }
    res.status(500).json({ error: "Failed to delete appointment" });
  }
});

/* ======================================================
   7️⃣  GET /api/doctor/prescriptions  —  Fetch All
   ====================================================== */
router.get("/prescriptions", async (req, res) => {
  try {
    const { doctorId } = req.query; // userId (UUID)
    if (!doctorId) return res.status(400).json({ error: "Doctor ID required" });

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: doctorId },
    });
    if (!doctorProfile) return res.status(404).json({ error: "Doctor profile not found" });

    const prescriptions = await prisma.prescription.findMany({
      where: { doctorId: doctorProfile.id },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(prescriptions);
  } catch (err) {
    console.error("❌ Error fetching prescriptions:", err);
    res.status(500).json({ error: "Failed to fetch prescriptions" });
  }
});

/* ======================================================
   8️⃣  POST /api/doctor/prescriptions  —  Create New
   ====================================================== */
// routes/doctor.js (or doctorPrescriptions.js)
router.post("/prescriptions", async (req, res) => {
  try {
    const {
      doctorId, // can be User.id (recommended) OR DoctorProfile.id
      patientId, // PatientProfile.id
      medication,
      dosage,
      frequency,
      duration,
      notes,
    } = req.body || {};

    // basic validation
    if (!doctorId || !patientId || !medication || !dosage || !frequency || !duration) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Resolve doctor profile:
    // 1) try as userId
    let doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: doctorId },
    });
    // 2) if not found, try as profile id
    if (!doctorProfile) {
      doctorProfile = await prisma.doctorProfile.findUnique({
        where: { id: doctorId },
      });
    }
    if (!doctorProfile) {
      return res.status(404).json({ error: "Doctor profile not found" });
    }

    // Ensure patient profile exists (patientId is PatientProfile.id)
    const patientProfile = await prisma.patientProfile.findUnique({
      where: { id: patientId },
    });
    if (!patientProfile) {
      return res.status(404).json({ error: "Patient profile not found" });
    }

    const created = await prisma.prescription.create({
      data: {
        doctorId: doctorProfile.id,
        patientId: patientProfile.id,
        medication,
        dosage,
        frequency,
        duration,
        notes: notes ?? null,
      },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
    });

    // after `created` prescription is saved:
    // 1) Logic for Patient's Selected Pharmacy (Auto-dispatch)
    const selectedMapping = await prisma.selectedPharmacy.findFirst({
      where: { patientId: patientProfile.id },
      orderBy: [{ preferred: "desc" }, { createdAt: "desc" }],
    });

    let finalPrescription = created;
    let targetPharmacyId =
      req.body.pharmacyId || (selectedMapping ? selectedMapping.pharmacyId : null);

    if (targetPharmacyId) {
      finalPrescription = await prisma.prescription.update({
        where: { id: created.id },
        data: {
          pharmacyId: targetPharmacyId,
          dispatchStatus: "SENT",
          dispatchedAt: new Date(),
        },
        include: {
          doctor: { include: { user: true } },
          patient: { include: { user: true } },
          pharmacy: { include: { user: true } },
        },
      });

      // Notify Pharmacy
      if (finalPrescription.pharmacy?.user?.email) {
        emailService
          .sendNewPrescriptionNotification(
            finalPrescription,
            finalPrescription.patient.user,
            finalPrescription.doctor.user,
            finalPrescription.pharmacy
          )
          .catch((err) => console.error("Failed to notify pharmacy of new prescription:", err));
      }
    }

    return res.status(201).json(finalPrescription);
  } catch (error) {
    console.error("❌ Error creating prescription:", error);
    return res.status(500).json({ error: "Failed to create prescription" });
  }
});

/* ======================================================
   9️⃣  DELETE /api/doctor/prescriptions/:id  —  Delete
   ====================================================== */
router.delete("/prescriptions/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const doctorUserId = req.user?.id;

    // Verify ownership - prescription must belong to this doctor
    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: { doctor: { select: { userId: true } } },
    });

    if (!prescription) {
      return res.status(404).json({ error: "Prescription not found" });
    }

    // Only doctor who created it (or admin/superadmin) can delete
    if (
      prescription.doctor.userId !== doctorUserId &&
      !["SUPERADMIN", "ADMIN"].includes(req.user?.role)
    ) {
      return res.status(403).json({ error: "Not authorized to delete this prescription" });
    }

    await prisma.prescription.delete({ where: { id } });
    res.json({ message: "Prescription deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting prescription:", err);
    res.status(500).json({ error: "Failed to delete prescription" });
  }
});

/* ======================================================
   🔁 PATCH /api/doctor/prescriptions/:id — Edit Prescription
   ====================================================== */
router.patch("/prescriptions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doctorUserId = req.user?.id;
    const { medication, dosage, frequency, duration, notes, patientId } = req.body;

    // Verify ownership
    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: { doctor: { select: { userId: true } } },
    });

    if (!prescription) {
      return res.status(404).json({ error: "Prescription not found" });
    }

    // Only doctor who created it (or admin/superadmin) can edit
    if (
      prescription.doctor.userId !== doctorUserId &&
      !["SUPERADMIN", "ADMIN"].includes(req.user?.role)
    ) {
      return res.status(403).json({ error: "Not authorized to edit this prescription" });
    }

    const updated = await prisma.prescription.update({
      where: { id },
      data: { medication, dosage, frequency, duration, notes, patientId },
    });
    res.json(updated);
  } catch (err) {
    console.error("❌ Error updating prescription:", err);
    res.status(500).json({ error: "Failed to update prescription" });
  }
});

//=========================================================================
// ==== Doctor Messages (mirror of patient messages) ==================
/**
 * GET /api/doctor/messages/inbox?doctorId=<User.id>
 * Returns messages received by this doctor (receiverId = doctor’s User.id)
 ========================================================================*/
router.get("/messages/inbox", async (req, res) => {
  try {
    const doctorUserId = String(req.query.doctorId || "").trim();
    if (!doctorUserId) {
      return res.status(400).json({ error: "doctorId is required" });
    }

    // Ensure doctor user exists (optional but nice)
    const doctorUser = await prisma.user.findUnique({
      where: { id: doctorUserId },
      select: { id: true },
    });
    if (!doctorUser) return res.status(404).json({ error: "Doctor user not found" });

    const messages = await prisma.message.findMany({
      where: { receiverId: doctorUserId },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        receiver: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(messages);
  } catch (err) {
    console.error("❌ GET /api/doctor/messages/inbox error:", err);
    return res.status(500).json({ error: "Failed to load inbox" });
  }
});

// PATCH /api/doctor/messages/read/:id  → mark a message as read

router.patch("/messages/read/:id", async (req, res) => {
  try {
    const id = String(req.params.id);
    const userId = String(req.query.userId || req.user?.id || "");
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const found = await prisma.message.findUnique({
      where: { id },
      select: { id: true, receiverId: true },
    });
    if (!found) return res.status(404).json({ error: "Message not found" });
    if (found.receiverId !== userId) return res.status(403).json({ error: "Not allowed" });

    const updated = await prisma.message.update({
      where: { id },
      data: { readAt: new Date() },
    });
    res.json({ success: true, data: updated });
  } catch (e) {
    console.error("mark read error", e);
    res.status(500).json({ error: "Failed to mark read" });
  }
});

// DELETE /api/doctor/messages/delete/:id  → hard delete a message
// DELETE /api/doctor/messages/delete/:id?userId=<User.id>
router.delete("/messages/delete/:id", async (req, res) => {
  try {
    const id = String(req.params.id);
    const userId = String(req.query.userId || req.user?.id || "");

    if (!id) return res.status(400).json({ error: "message id is required" });
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const found = await prisma.message.findUnique({
      where: { id },
      select: { id: true, senderId: true, receiverId: true },
    });
    if (!found) return res.status(404).json({ error: "Message not found" });

    if (found.senderId !== userId && found.receiverId !== userId) {
      return res.status(403).json({ error: "Not allowed" });
    }

    await prisma.message.delete({ where: { id } });
    return res.json({ success: true });
  } catch (err) {
    console.error("❌ DELETE /doctor/messages/delete/:id error:", err);
    return res.status(500).json({ error: "Failed to delete message" });
  }
});

// Duplicate /patients route removed, handled in doctorPatients.js

/**
 * POST /api/doctor/messages/send
 * Body: { senderId: User.id (doctor), receiverId: User.id (patient), content }
 * NOTE: Accepts ONLY User IDs (mirrors working patient send).
 */
router.post("/messages/send", async (req, res) => {
  try {
    const { senderId, receiverId, content } = req.body || {};
    if (!senderId || !receiverId || !content) {
      return res.status(400).json({ error: "senderId, receiverId and content are required" });
    }

    // Verify both users exist (helps catch wrong id issues)
    const [sender, receiver] = await Promise.all([
      prisma.user.findUnique({
        where: { id: String(senderId) },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { id: String(receiverId) },
        select: { id: true },
      }),
    ]);
    if (!sender || !receiver) {
      return res.status(400).json({ error: "Invalid sender or receiver" });
    }

    const created = await prisma.message.create({
      data: {
        senderId: String(senderId),
        receiverId: String(receiverId),
        content: String(content),
        readAt: null,
      },
    });

    const { emitToUser } = require("../socket/socketHandler.cjs");
    emitToUser(String(receiverId), "receiveMessage", {
      ...created,
      timestamp: created.createdAt
    });

    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error("❌ POST /doctor/messages/send error:", err);
    return res.status(500).json({ error: "Failed to send message" });
  }
});

/**
 * (Optional) GET /api/doctor/messages/inbox?doctorId=<User.id>
 * So the doctor can view received messages.
 */
// router.get("/messages/inbox", async (req, res) => {
//   try {
//     const doctorUserId = req.query.doctorId;
//     if (!doctorUserId) return res.status(400).json({ error: "doctorId is required" });

//     const items = await prisma.message.findMany({
//       where: { receiverId: String(doctorUserId) },
//       include: {
//         sender: { select: { id: true, firstName: true, lastName: true, email: true } },
//         receiver: { select: { id: true, firstName: true, lastName: true, email: true } },
//       },
//       orderBy: { createdAt: "desc" },
//     });

//     return res.json(items);
//   } catch (err) {
//     console.error("❌ GET /doctor/messages/inbox error:", err);
//     return res.status(500).json({ error: "Failed to fetch inbox" });
//   }
// });

// Redundant /patients route removed

// router.get("/patients", async (req, res) => {
//   try {
//     const patients = await prisma.patientProfile.findMany({
//       include: {
//         user: {
//           select: {
//             id: true,
//             firstName: true, lastName: true,
//             email: true,
//           },
//         },
//       },
//       orderBy: { createdAt: "desc" },
//     });

//     // Format data for the frontend — ensures id + user info
//     const formatted = patients.map((p) => ({
//       id: p.id,                // ✅ PatientProfile.id (for value)
//       userId: p.user.id,       // optional reference to User table
//       name: p.user.name,       // ✅ Display name
//       email: p.user.email,
//     }));

//     res.json(formatted);
//   } catch (err) {
//     console.error("❌ Error fetching patients:", err);
//     res.status(500).json({ error: "Failed to fetch patients" });
//   }
// });

// Redundant /patients routes removed

// End of Prescription CRUD (Duplicate code removed)

// ---------------------------------------------
// GET /api/doctors — List all doctors
// ---------------------------------------------
router.get("/", async (req, res) => {
  try {
    const doctors = await prisma.doctorProfile.findMany({
      select: {
        id: true,
        specialization: true,
        qualifications: true,
        licenseNumber: true,
        hospitalAffiliation: true,
        yearsOfExperience: true,
        consultationFee: true,
        bio: true,
        user: {
          select: {
            firstName: true,
            lastName: true, // ✅ fixed field name
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = doctors.map((doc) => ({
      id: doc.id,
      name: doc.user.name,
      specialization: doc.specialization,
      experience: doc.yearsOfExperience,
      consultationFee: doc.consultationFee,
      hospitalAffiliation: doc.hospitalAffiliation,
      bio: doc.bio,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("❌ Error fetching doctors:", error);
    res.status(500).json({ error: "Failed to load doctors" });
  }
});

//=======================================
// SUBSCRIPTION
//=======================================
// POST /api/subscription/stripe/checkout
// body: { userId, plan: "MONTHLY"|"YEARLY" }
router.post("/subscription/stripe/checkout", async (req, res) => {
  const { userId, plan } = req.body || {};
  // 1) look up prices from SubscriptionSetting
  // 2) create a Stripe Price/Checkout Session with success/cancel URLs
  // 3) create a pending Subscription row (status=PENDING) referencing session id
  // 4) return { url: session.url }
});

module.exports = router;
