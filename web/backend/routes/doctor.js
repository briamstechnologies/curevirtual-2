// const express = require("express");
// const { verifyToken, requireRole } = require("../middleware/rbac.js");

// const prisma = require("../prisma/prismaClient");
// const emailService = require("../services/emailService");
// const { parseAsLocal } = require("../utils/timeUtils");
// const { ensureDefaultProfile } = require("../lib/provisionProfile.js");
// const router = express.Router();

// // Apply RBAC to all doctor routes
// router.use(verifyToken);
// router.use(requireRole(["DOCTOR", "SUPERADMIN", "ADMIN"]));

// /**
//  * GET /api/doctor/waiting-patients?doctorId=<User.id>
//  * Returns patients currently waiting or checked in.
//  */
// router.get("/waiting-patients", async (req, res) => {
//   try {
//     const doctorUserId = req.query.doctorId || req.user?.id;
//     if (!doctorUserId) return res.status(400).json({ error: "doctorId is required" });

//     const doctorProfile = await prisma.doctorProfile.findUnique({
//       where: { userId: doctorUserId },
//       select: { id: true },
//     });
//     if (!doctorProfile) return res.json([]);

//     const waiting = await prisma.appointment.findMany({
//       where: {
//         doctorId: doctorProfile.id,
//         status: { in: ["CHECKED_IN", "WAITING"] },
//       },
//       include: {
//         patient: {
//           include: {
//             user: {
//               select: {
//                 id: true,
//                 firstName: true,
//                 lastName: true,
//                 email: true,
//                 phone: true,
//                 gender: true,
//                 dateOfBirth: true,
//               },
//             },
//           },
//         },
//       },
//       orderBy: { appointmentDate: "asc" },
//     });

//     return res.json(waiting);
//   } catch (err) {
//     console.error("waiting-patients error:", err);
//     return res.status(500).json({ error: "Failed to fetch waiting patients" });
//   }
// });

// /**
//  * GET /api/doctor/stats?doctorId=<User.id>
//  * Returns dashboard stats for a doctor.
//  */
// router.get("/stats", async (req, res) => {
//   try {
//     const doctorUserId = req.query.doctorId || req.user?.id;
//     if (!doctorUserId) {
//       return res.status(400).json({ error: "doctorId (User.id) is required" });
//     }

//     // Resolve the DoctorProfile (most relations use DoctorProfile.id)
//     const doctorProfile = await prisma.doctorProfile.findUnique({
//       where: { userId: doctorUserId },
//       select: { id: true },
//     });

//     // If no profile, return zeroed stats (prevents 500s on new accounts)
//     if (!doctorProfile) {
//       return res.json({
//         totalAppointments: 0,
//         completedAppointments: 0,
//         pendingAppointments: 0,
//         totalPrescriptions: 0,
//         totalMessages: await prisma.message.count({
//           where: {
//             OR: [{ senderId: doctorUserId }, { receiverId: doctorUserId }],
//           },
//         }),
//         activePatients: 0,
//       });
//     }

//     const dpId = doctorProfile.id;

//     // Queries in parallel for speed
//     const [
//       totalAppointments,
//       completedAppointments,
//       pendingAppointments,
//       totalPrescriptions,
//       totalMessages,
//       distinctPatients,
//     ] = await Promise.all([
//       prisma.appointment.count({
//         where: { doctorId: dpId },
//       }),
//       prisma.appointment.count({
//         where: { doctorId: dpId, status: "COMPLETED" },
//       }),
//       prisma.appointment.count({
//         where: { doctorId: dpId, status: "PENDING" },
//       }),
//       prisma.prescription.count({
//         where: { doctorId: dpId },
//       }),
//       prisma.message.count({
//         where: {
//           OR: [{ senderId: doctorUserId }, { receiverId: doctorUserId }],
//         },
//       }),
//       // Distinct patients this doctor has appointments with
//       prisma.appointment.findMany({
//         where: { doctorId: dpId },
//         distinct: ["patientId"],
//         select: { patientId: true },
//       }),
//     ]);

//     const activePatients = distinctPatients.length;

//     // Enhanced stats for Dashboard
//     const [urgentLabs, unsignedNotes, lateAppointments] = await Promise.all([
//       prisma.labOrder.count({
//         where: { doctorId: dpId, status: "ORDERED" },
//       }),
//       prisma.clinicalEncounter.count({
//         where: { doctorId: dpId, status: "DRAFT" },
//       }),
//       prisma.appointment.count({
//         where: {
//           doctorId: dpId,
//           status: { in: ["WAITING", "CHECKED_IN"] },
//           appointmentDate: { lt: new Date() },
//         },
//       }),
//     ]);

//     return res.json({
//       totalAppointments,
//       completedAppointments,
//       pendingAppointments,
//       totalPrescriptions,
//       totalMessages,
//       activePatients,
//       urgentFlags: {
//         urgentLabs,
//         unsignedNotes,
//         lateAppointments,
//       },
//     });
//   } catch (err) {
//     console.error("❌ /api/doctor/stats error:", err);
//     return res.status(500).json({ error: "Failed to fetch doctor stats" });
//   }
// });

// /*================================================================
// // ✅ GET /api/doctor/profile?userId=xxxx
// ==================================================================*/

// // GET /api/doctor/profile?userId=...
// router.get("/profile", async (req, res) => {
//   try {
//     const userId = req.query.userId || req.user?.id;
//     if (!userId) return res.status(400).json({ error: "userId is required" });

//     const user = await prisma.user.findUnique({ where: { id: userId } });
//     if (!user) return res.status(404).json({ error: "User not found" });

//     let profile = await prisma.doctorProfile.findUnique({
//       where: { userId },
//       include: { user: true },
//     });
//     if (!profile && user.role === "DOCTOR") {
//       profile = await ensureDefaultProfile(user);
//     }

//     if (!profile) return res.status(404).json({ error: "Profile not found" });

//     return res.json({ data: profile });
//   } catch (e) {
//     console.error("❌ doctor profile GET error:", e);
//     return res.status(500).json({ error: "Failed to load profile" });
//   }
// });

// // PUT /api/doctor/profile (upsert)

// router.put("/profile", async (req, res) => {
//   try {
//     const {
//       userId,
//       firstName, // ✅ Extract Name
//       middleName,
//       lastName, // ✅ Extract Name
//       phone, // ✅ Extract Phone
//       specialization,
//       customProfession,
//       qualifications,
//       licenseNumber,
//       hospitalAffiliation,
//       yearsOfExperience,
//       consultationFee,
//       availability, // JSON string or object
//       timezone, // String
//       bio,
//       languages, // JSON string or array
//       emergencyContact,
//       emergencyContactName,
//       emergencyContactEmail,
//     } = req.body || {};

//     if (!userId) return res.status(400).json({ error: "userId is required" });

//     // ✅ Update User fields (Name, Phone)
//     console.log(`[RBAC] Incoming Doctor Profile Update - UserID: ${userId}, TokenID: ${req.user.id}, Role: ${req.user.role}, Timezone: ${req.body.timezone}`);

//     if (req.user.role === "DOCTOR" && String(req.user.id) !== String(userId)) {
//       console.warn(`[RBAC] 🛡️ Blocked doctor profile update attempt. Request ID: ${userId}, Token ID: ${req.user.id}`);
//       return res.status(403).json({ 
//         error: "Forbidden", 
//         message: "You are not authorized to update this profile." 
//       });
//     }

//     // ✅ Update User fields (Name, Phone, MaritalStatus)
//     const userData = {
//       ...(firstName !== undefined && { firstName }),
//       ...(middleName !== undefined && { middleName }),
//       ...(lastName !== undefined && { lastName }),
//       ...(phone !== undefined && { phone }),
//       ...(req.body.maritalStatus !== undefined && { maritalStatus: req.body.maritalStatus }),
//     };

//     if (Object.keys(userData).length > 0) {
//       await prisma.user.update({
//         where: { id: userId },
//         data: userData,
//       });
//     }

//     const doctorData = {
//       ...(specialization !== undefined && { specialization }),
//       ...(customProfession !== undefined && { customProfession }),
//       ...(qualifications !== undefined && { qualifications }),
//       ...(licenseNumber !== undefined && { licenseNumber }),
//       ...(hospitalAffiliation !== undefined && { hospitalAffiliation }),
//       ...(yearsOfExperience !== undefined && { yearsOfExperience: Number(yearsOfExperience) || 0 }),
//       ...(consultationFee !== undefined && { consultationFee: Number(consultationFee) || 0 }),
//       ...(availability !== undefined && { availability: typeof availability === 'string' ? availability : JSON.stringify(availability) }),
//       ...(req.body.timezone !== undefined && { timezone: req.body.timezone }),
//       ...(bio !== undefined && { bio }),
//       ...(languages !== undefined && { languages: Array.isArray(languages) ? JSON.stringify(languages) : languages }),
//       ...(emergencyContact !== undefined && { emergencyContact }),
//       ...(emergencyContactName !== undefined && { emergencyContactName }),
//       ...(emergencyContactEmail !== undefined && { emergencyContactEmail }),
//     };

//     const updated = await prisma.doctorProfile.upsert({
//       where: { userId },
//       update: {
//         ...doctorData,
//       },
//       create: {
//         userId,
//         specialization: specialization ?? "General Medicine",
//         customProfession: customProfession || null,
//         qualifications: qualifications ?? "MBBS",
//         licenseNumber: licenseNumber || `LIC-${userId.slice(0, 8).toUpperCase()}`,
//         hospitalAffiliation: hospitalAffiliation ?? "",
//         yearsOfExperience: yearsOfExperience ?? 0,
//         consultationFee: consultationFee ?? 0,
//         availability:
//           typeof availability === "string" ? availability : JSON.stringify(availability || {}),
//         timezone: timezone ?? "Asia/Karachi",
//         bio: bio ?? "",
//         languages: Array.isArray(languages)
//           ? JSON.stringify(languages)
//           : (languages ?? JSON.stringify(["English"])),
//         emergencyContact: emergencyContact ?? "",
//         emergencyContactName: emergencyContactName ?? "",
//         emergencyContactEmail: emergencyContactEmail ?? "",
//       },
//       include: { user: true },
//     });

//     // Fetch updated user to get email for notification
//     const userForEmail = await prisma.user.findUnique({
//       where: { id: userId },
//     });
//     if (userForEmail) {
//       emailService
//         .sendProfileUpdateConfirmation(userForEmail, "Doctor")
//         .catch((err) => console.error("Failed to send profile update email:", err));
//     }

//     return res.json({ data: updated });
//   } catch (e) {
//     console.error("❌ doctor profile PUT error:", e);
//     return res.status(500).json({ error: "Failed to save profile" });
//   }
// });

// // router.get("/profile", async (req, res) => {
// //   try {
// //     const { userId } = req.query;
// //     if (!userId) return res.status(400).json({ error: "Missing userId" });

// //     const doctorProfile = await prisma.doctorProfile.findUnique({
// //       where: { userId },
// //       include: {
// //         user: { select: { id: true, firstName: true, lastName: true, email: true } },
// //       },
// //     });

// //     if (!doctorProfile)
// //       return res.status(404).json({ error: "Doctor profile not found" });

// //     res.json(doctorProfile);
// //   } catch (error) {
// //     console.error("❌ Error fetching doctor profile:", error);
// //     res.status(500).json({ error: "Internal server error" });
// //   }
// // });

// // GET /api/doctor/list
// router.get("/list", async (_req, res) => {
//   try {
//     const list = await prisma.doctorProfile.findMany({
//       include: {
//         user: {
//           select: { id: true, firstName: true, lastName: true, email: true },
//         },
//       },
//       orderBy: { createdAt: "desc" },
//     });
//     res.json(list);
//   } catch (err) {
//     console.error("❌ GET /api/doctor/list error:", err);
//     res.status(500).json({ error: "Failed to load doctors" });
//   }
// });

// /**
//  * GET /api/doctor/my-patients?doctorId=<User.id>
//  * Returns DISTINCT patients for this doctor (based on appointments).
//  * Each patient includes User info.
//  */
// router.get("/my-patients", async (req, res) => {
//   try {
//     const doctorUserId = req.query.doctorId;
//     if (!doctorUserId) {
//       return res.status(400).json({ error: "doctorId (User.id) is required" });
//     }

//     // Resolve the doctor profile (DoctorProfile.id)
//     const doctorProfile = await prisma.doctorProfile.findUnique({
//       where: { userId: doctorUserId },
//       select: { id: true },
//     });

//     if (!doctorProfile) {
//       return res.json([]); // No profile yet → no patients
//     }

//     // Distinct patientIds from appointments with this doctor
//     const distinct = await prisma.appointment.findMany({
//       where: { doctorId: doctorProfile.id },
//       distinct: ["patientId"],
//       select: { patientId: true },
//     });

//     const patientIds = distinct.map((d) => d.patientId);
//     if (patientIds.length === 0) {
//       return res.json([]);
//     }

//     // Fetch PatientProfile + linked User
//     const patients = await prisma.patientProfile.findMany({
//       where: { id: { in: patientIds } },
//       select: {
//         id: true,
//         bloodGroup: true,
//         height: true,
//         weight: true,
//         allergies: true,
//         medications: true,
//         medicalHistory: true,
//         address: true,
//         emergencyContact: true,
//         user: {
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//             email: true,
//             phone: true,
//             dateOfBirth: true,
//             gender: true,
//           },
//         },
//         createdAt: true,
//         updatedAt: true,
//       },
//       orderBy: { createdAt: "desc" },
//     });

//     // Shape a simple list for the table
//     const result = patients.map((p) => ({
//       id: p.id, // PatientProfile.id
//       name: `${p.user?.firstName || ""} ${p.user?.lastName || ""}`.trim() || "Unknown",
//       email: p.user?.email || "",
//       gender: p.user?.gender || null,
//       dateOfBirth: p.user?.dateOfBirth || null,
//       bloodGroup: p.bloodGroup || null,
//       // For modal (we can pass through the entire object)
//       profile: p,
//     }));

//     return res.json(result);
//   } catch (err) {
//     console.error("❌ /api/doctor/my-patients error:", err);
//     return res.status(500).json({ error: err.message, details: err.toString() });
//   }
// });

// /**
//  * GET /api/doctor/patient/:id
//  * Returns full patient profile (by PatientProfile.id) with linked User.
//  */
// router.get("/patient/:id", async (req, res) => {
//   try {
//     const { id } = req.params; // PatientProfile.id
//     const patient = await prisma.patientProfile.findUnique({
//       where: { id },
//       include: {
//         user: {
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//             email: true,
//             phone: true,
//             gender: true,
//             dateOfBirth: true,
//             createdAt: true,
//           },
//         },
//       },
//     });

//     if (!patient) {
//       return res.status(404).json({ error: "Patient not found" });
//     }
//     return res.json(patient);
//   } catch (err) {
//     console.error("❌ /api/doctor/patient/:id error:", err);
//     return res.status(500).json({ error: "Failed to fetch patient" });
//   }
// });

// //======================APPOINTMENTS=============================

// // ======================================================
// // 1️⃣ POST /api/doctor/appointment — Create Appointment
// // ======================================================
// router.post("/appointments", async (req, res) => {
//   try {
//     const { doctorId, patientId, appointmentDate, reason } = req.body;

//     if (!doctorId || !patientId || !appointmentDate) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     const doctorProfile = await prisma.doctorProfile.findUnique({
//       where: { userId: doctorId },
//     });
//     if (!doctorProfile) {
//       return res.status(404).json({ error: "Doctor profile not found" });
//     }

//     const patientProfile = await prisma.patientProfile.findUnique({
//       where: { id: patientId },
//     });
//     if (!patientProfile) {
//       return res.status(404).json({ error: "Patient profile not found" });
//     }

//     console.log("DEBUG: Creating appointment", { doctorId, patientId, appointmentDate });
//     const localDate = parseAsLocal(appointmentDate);
//     console.log("DEBUG: Parsed appointmentDate", {
//       input: appointmentDate,
//       stored: localDate.toISOString(),
//     });

//     const newAppointment = await prisma.appointment.create({
//       data: {
//         doctorId: doctorProfile.id,
//         patientId: patientProfile.id,
//         appointmentDate: localDate,
//         reason,
//       },
//     });

//     // Update with roomName
//     await prisma.appointment.update({
//       where: { id: newAppointment.id },
//       data: { roomName: `appointment-${newAppointment.id}` },
//     });

//     const finalAppointment = await prisma.appointment.findUnique({
//       where: { id: newAppointment.id },
//       include: {
//         doctor: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } } },
//         patient: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, gender: true, dateOfBirth: true } } } },
//       },
//     });

//     if (finalAppointment.doctor?.user && finalAppointment.patient?.user) {
//       emailService
//         .sendAppointmentBookingConfirmation(
//           finalAppointment,
//           finalAppointment.patient.user,
//           finalAppointment.doctor.user
//         )
//         .catch((err) => console.error("Failed to send appointment emails:", err));
//     }

//     res.status(201).json(newAppointment);
//   } catch (error) {
//     console.error("❌ Error creating appointment:", error);
//     res.status(500).json({ error: "Failed to create appointment" });
//   }
// });

// // ======================================================
// // 2️⃣ PATCH /api/doctor/appointment/:id — Update Appointment
// // ======================================================
// router.patch("/appointments/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { appointmentDate, reason, status } = req.body;

//     const updatedAppointment = await prisma.appointment.update({
//       where: { id },
//       data: {
//         ...(appointmentDate && { appointmentDate: parseAsLocal(appointmentDate) }),
//         ...(reason && { reason }),
//         ...(status && { status }),
//       },
//       include: {
//         doctor: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } } },
//         patient: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, gender: true, dateOfBirth: true } } } },
//       },
//     });

//     if (status && updatedAppointment.patient?.user && updatedAppointment.doctor?.user) {
//       emailService
//         .sendAppointmentStatusChange(
//           updatedAppointment,
//           updatedAppointment.patient.user,
//           updatedAppointment.doctor.user,
//           status
//         )
//         .catch((err) => console.error("Failed to send appointment status email:", err));
//     }

//     res.json(updatedAppointment);
//   } catch (error) {
//     console.error("❌ Error updating appointment:", error);
//     res.status(500).json({ error: "Failed to update appointment" });
//   }
// });

// /* ======================================================
//    2️⃣  GET /api/doctor/appointments — Fetch All
//    ====================================================== */
// router.get("/appointments", async (req, res) => {
//   const doctorId = req.query.doctorId || req.user?.id; // doctorId = User.id

//   console.log("DEBUG: GET /doctor/appointments", {
//     query: req.query,
//     user: req.user,
//     resolvedDoctorId: doctorId,
//   });

//   if (!doctorId) return res.status(400).json({ error: "doctorId (User ID) is required" });

//   try {
//     // ✅ Find DoctorProfile using userId
//     const doctorProfile = await prisma.doctorProfile.findUnique({
//       where: { userId: doctorId },
//     });

//     if (!doctorProfile) return res.status(404).json({ error: "Doctor profile not found" });

//     // ✅ Fetch all appointments for this doctor
//     const appointments = await prisma.appointment.findMany({
//       where: { doctorId: doctorProfile.id },
//       include: {
//         doctor: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } } },
//         patient: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, gender: true, dateOfBirth: true } } } },
//       },
//       orderBy: { appointmentDate: "desc" },
//     });

//     res.json(appointments);
//   } catch (err) {
//     console.error("❌ Error fetching doctor appointments:", err);
//     res.status(500).json({ error: "Failed to fetch doctor appointments" });
//   }
// });

// /* ======================================================
//    5️⃣  PATCH /api/doctor/appointments/:id/cancel — Cancel
//    ====================================================== */
// router.patch("/appointments/:id/cancel", async (req, res) => {
//   const { id } = req.params;
//   try {
//     await prisma.appointment.update({
//       where: { id },
//       data: { status: "CANCELLED" },
//     });
//     res.json({ message: "Appointment cancelled" });
//   } catch (err) {
//     console.error("❌ Error cancelling appointment:", err);
//     res.status(500).json({ error: "Failed to cancel appointment" });
//   }
// });

// /* ======================================================
//    🗑️  DELETE /api/doctor/appointment/:id
//    ====================================================== */
// router.delete("/appointments/:id", async (req, res) => {
//   try {
//     const { id } = req.params;

//     await prisma.appointment.delete({ where: { id } });

//     res.json({ message: "Appointment deleted" });
//   } catch (error) {
//     console.error("❌ Error deleting appointment:", error);
//     if (error.code === "P2025") {
//       return res.status(404).json({ error: "Appointment not found" });
//     }
//     res.status(500).json({ error: "Failed to delete appointment" });
//   }
// });

// /* ======================================================
//    7️⃣  GET /api/doctor/prescriptions  —  Fetch All
//    ====================================================== */
// router.get("/prescriptions", async (req, res) => {
//   try {
//     const { doctorId } = req.query; // userId (UUID)
//     if (!doctorId) return res.status(400).json({ error: "Doctor ID required" });

//     const doctorProfile = await prisma.doctorProfile.findUnique({
//       where: { userId: doctorId },
//     });
//     if (!doctorProfile) return res.status(404).json({ error: "Doctor profile not found" });

//     const prescriptions = await prisma.prescription.findMany({
//       where: { doctorId: doctorProfile.id },
//       include: {
//         doctor: { include: { user: true } },
//         patient: { include: { user: true } },
//       },
//       orderBy: { createdAt: "desc" },
//     });

//     res.json(prescriptions);
//   } catch (err) {
//     console.error("❌ Error fetching prescriptions:", err);
//     res.status(500).json({ error: "Failed to fetch prescriptions" });
//   }
// });

// /* ======================================================
//    8️⃣  POST /api/doctor/prescriptions  —  Create New
//    ====================================================== */
// // routes/doctor.js (or doctorPrescriptions.js)
// router.post("/prescriptions", async (req, res) => {
//   try {
//     const {
//       doctorId, // can be User.id (recommended) OR DoctorProfile.id
//       patientId, // PatientProfile.id
//       medication,
//       dosage,
//       frequency,
//       duration,
//       notes,
//     } = req.body || {};

//     // basic validation
//     if (!doctorId || !patientId || !medication || !dosage || !frequency || !duration) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     // Resolve doctor profile:
//     // 1) try as userId
//     let doctorProfile = await prisma.doctorProfile.findUnique({
//       where: { userId: doctorId },
//     });
//     // 2) if not found, try as profile id
//     if (!doctorProfile) {
//       doctorProfile = await prisma.doctorProfile.findUnique({
//         where: { id: doctorId },
//       });
//     }
//     if (!doctorProfile) {
//       return res.status(404).json({ error: "Doctor profile not found" });
//     }

//     // Ensure patient profile exists (patientId is PatientProfile.id)
//     const patientProfile = await prisma.patientProfile.findUnique({
//       where: { id: patientId },
//     });
//     if (!patientProfile) {
//       return res.status(404).json({ error: "Patient profile not found" });
//     }

//     const created = await prisma.prescription.create({
//       data: {
//         doctorId: doctorProfile.id,
//         patientId: patientProfile.id,
//         medication,
//         dosage,
//         frequency,
//         duration,
//         notes: notes ?? null,
//       },
//       include: {
//         doctor: { include: { user: true } },
//         patient: { include: { user: true } },
//       },
//     });

//     // after `created` prescription is saved:
//     // 1) Logic for Patient's Selected Pharmacy (Auto-dispatch)
//     const selectedMapping = await prisma.selectedPharmacy.findFirst({
//       where: { patientId: patientProfile.id },
//       orderBy: [{ preferred: "desc" }, { createdAt: "desc" }],
//     });

//     let finalPrescription = created;
//     let targetPharmacyId =
//       req.body.pharmacyId || (selectedMapping ? selectedMapping.pharmacyId : null);

//     if (targetPharmacyId) {
//       finalPrescription = await prisma.prescription.update({
//         where: { id: created.id },
//         data: {
//           pharmacyId: targetPharmacyId,
//           dispatchStatus: "SENT",
//           dispatchedAt: new Date(),
//         },
//         include: {
//           doctor: { include: { user: true } },
//           patient: { include: { user: true } },
//           pharmacy: { include: { user: true } },
//         },
//       });

//       // Notify Pharmacy
//       if (finalPrescription.pharmacy?.user?.email) {
//         emailService
//           .sendNewPrescriptionNotification(
//             finalPrescription,
//             finalPrescription.patient.user,
//             finalPrescription.doctor.user,
//             finalPrescription.pharmacy
//           )
//           .catch((err) => console.error("Failed to notify pharmacy of new prescription:", err));
//       }
//     }

//     return res.status(201).json(finalPrescription);
//   } catch (error) {
//     console.error("❌ Error creating prescription:", error);
//     return res.status(500).json({ error: "Failed to create prescription" });
//   }
// });

// /* ======================================================
//    9️⃣  DELETE /api/doctor/prescriptions/:id  —  Delete
//    ====================================================== */
// router.delete("/prescriptions/:id", async (req, res) => {
//   const { id } = req.params;
//   try {
//     const doctorUserId = req.user?.id;

//     // Verify ownership - prescription must belong to this doctor
//     const prescription = await prisma.prescription.findUnique({
//       where: { id },
//       include: { doctor: { select: { userId: true } } },
//     });

//     if (!prescription) {
//       return res.status(404).json({ error: "Prescription not found" });
//     }

//     // Only doctor who created it (or admin/superadmin) can delete
//     if (
//       prescription.doctor.userId !== doctorUserId &&
//       !["SUPERADMIN", "ADMIN"].includes(req.user?.role)
//     ) {
//       return res.status(403).json({ error: "Not authorized to delete this prescription" });
//     }

//     await prisma.prescription.delete({ where: { id } });
//     res.json({ message: "Prescription deleted successfully" });
//   } catch (err) {
//     console.error("❌ Error deleting prescription:", err);
//     res.status(500).json({ error: "Failed to delete prescription" });
//   }
// });

// /* ======================================================
//    🔁 PATCH /api/doctor/prescriptions/:id — Edit Prescription
//    ====================================================== */
// router.patch("/prescriptions/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const doctorUserId = req.user?.id;
//     const { medication, dosage, frequency, duration, notes, patientId } = req.body;

//     // Verify ownership
//     const prescription = await prisma.prescription.findUnique({
//       where: { id },
//       include: { doctor: { select: { userId: true } } },
//     });

//     if (!prescription) {
//       return res.status(404).json({ error: "Prescription not found" });
//     }

//     // Only doctor who created it (or admin/superadmin) can edit
//     if (
//       prescription.doctor.userId !== doctorUserId &&
//       !["SUPERADMIN", "ADMIN"].includes(req.user?.role)
//     ) {
//       return res.status(403).json({ error: "Not authorized to edit this prescription" });
//     }

//     const updated = await prisma.prescription.update({
//       where: { id },
//       data: { medication, dosage, frequency, duration, notes, patientId },
//     });
//     res.json(updated);
//   } catch (err) {
//     console.error("❌ Error updating prescription:", err);
//     res.status(500).json({ error: "Failed to update prescription" });
//   }
// });

// //=========================================================================
// // ==== Doctor Messages (mirror of patient messages) ==================
// /**
//  * GET /api/doctor/messages/inbox?doctorId=<User.id>
//  * Returns messages received by this doctor (receiverId = doctor’s User.id)
//  ========================================================================*/
// router.get("/messages/inbox", async (req, res) => {
//   try {
//     const doctorUserId = String(req.query.doctorId || "").trim();
//     if (!doctorUserId) {
//       return res.status(400).json({ error: "doctorId is required" });
//     }

//     // Ensure doctor user exists (optional but nice)
//     const doctorUser = await prisma.user.findUnique({
//       where: { id: doctorUserId },
//       select: { id: true },
//     });
//     if (!doctorUser) return res.status(404).json({ error: "Doctor user not found" });

//     const messages = await prisma.message.findMany({
//       where: { receiverId: doctorUserId },
//       include: {
//         sender: {
//           select: { id: true, firstName: true, lastName: true, email: true },
//         },
//         receiver: {
//           select: { id: true, firstName: true, lastName: true, email: true },
//         },
//       },
//       orderBy: { createdAt: "desc" },
//     });

//     return res.json(messages);
//   } catch (err) {
//     console.error("❌ GET /api/doctor/messages/inbox error:", err);
//     return res.status(500).json({ error: "Failed to load inbox" });
//   }
// });

// // PATCH /api/doctor/messages/read/:id  → mark a message as read

// router.patch("/messages/read/:id", async (req, res) => {
//   try {
//     const id = String(req.params.id);
//     const userId = String(req.query.userId || req.user?.id || "");
//     if (!userId) return res.status(400).json({ error: "userId is required" });

//     const found = await prisma.message.findUnique({
//       where: { id },
//       select: { id: true, receiverId: true },
//     });
//     if (!found) return res.status(404).json({ error: "Message not found" });
//     if (found.receiverId !== userId) return res.status(403).json({ error: "Not allowed" });

//     const updated = await prisma.message.update({
//       where: { id },
//       data: { readAt: new Date() },
//     });
//     res.json({ success: true, data: updated });
//   } catch (e) {
//     console.error("mark read error", e);
//     res.status(500).json({ error: "Failed to mark read" });
//   }
// });

// // DELETE /api/doctor/messages/delete/:id  → hard delete a message
// // DELETE /api/doctor/messages/delete/:id?userId=<User.id>
// router.delete("/messages/delete/:id", async (req, res) => {
//   try {
//     const id = String(req.params.id);
//     const userId = String(req.query.userId || req.user?.id || "");

//     if (!id) return res.status(400).json({ error: "message id is required" });
//     if (!userId) return res.status(400).json({ error: "userId is required" });

//     const found = await prisma.message.findUnique({
//       where: { id },
//       select: { id: true, senderId: true, receiverId: true },
//     });
//     if (!found) return res.status(404).json({ error: "Message not found" });

//     if (found.senderId !== userId && found.receiverId !== userId) {
//       return res.status(403).json({ error: "Not allowed" });
//     }

//     await prisma.message.delete({ where: { id } });
//     return res.json({ success: true });
//   } catch (err) {
//     console.error("❌ DELETE /doctor/messages/delete/:id error:", err);
//     return res.status(500).json({ error: "Failed to delete message" });
//   }
// });

// // Duplicate /patients route removed, handled in doctorPatients.js

// /**
//  * POST /api/doctor/messages/send
//  * Body: { senderId: User.id (doctor), receiverId: User.id (patient), content }
//  * NOTE: Accepts ONLY User IDs (mirrors working patient send).
//  */
// router.post("/messages/send", async (req, res) => {
//   try {
//     const { senderId, receiverId, content } = req.body || {};
//     if (!senderId || !receiverId || !content) {
//       return res.status(400).json({ error: "senderId, receiverId and content are required" });
//     }

//     // Verify both users exist (helps catch wrong id issues)
//     const [sender, receiver] = await Promise.all([
//       prisma.user.findUnique({
//         where: { id: String(senderId) },
//         select: { id: true },
//       }),
//       prisma.user.findUnique({
//         where: { id: String(receiverId) },
//         select: { id: true },
//       }),
//     ]);
//     if (!sender || !receiver) {
//       return res.status(400).json({ error: "Invalid sender or receiver" });
//     }

//     const created = await prisma.message.create({
//       data: {
//         senderId: String(senderId),
//         receiverId: String(receiverId),
//         content: String(content),
//         readAt: null,
//       },
//     });

//     return res.status(201).json({ success: true, data: created });
//   } catch (err) {
//     console.error("❌ POST /doctor/messages/send error:", err);
//     return res.status(500).json({ error: "Failed to send message" });
//   }
// });

// /**
//  * (Optional) GET /api/doctor/messages/inbox?doctorId=<User.id>
//  * So the doctor can view received messages.
//  */
// // router.get("/messages/inbox", async (req, res) => {
// //   try {
// //     const doctorUserId = req.query.doctorId;
// //     if (!doctorUserId) return res.status(400).json({ error: "doctorId is required" });

// //     const items = await prisma.message.findMany({
// //       where: { receiverId: String(doctorUserId) },
// //       include: {
// //         sender: { select: { id: true, firstName: true, lastName: true, email: true } },
// //         receiver: { select: { id: true, firstName: true, lastName: true, email: true } },
// //       },
// //       orderBy: { createdAt: "desc" },
// //     });

// //     return res.json(items);
// //   } catch (err) {
// //     console.error("❌ GET /doctor/messages/inbox error:", err);
// //     return res.status(500).json({ error: "Failed to fetch inbox" });
// //   }
// // });

// // Redundant /patients route removed

// // router.get("/patients", async (req, res) => {
// //   try {
// //     const patients = await prisma.patientProfile.findMany({
// //       include: {
// //         user: {
// //           select: {
// //             id: true,
// //             firstName: true, lastName: true,
// //             email: true,
// //           },
// //         },
// //       },
// //       orderBy: { createdAt: "desc" },
// //     });

// //     // Format data for the frontend — ensures id + user info
// //     const formatted = patients.map((p) => ({
// //       id: p.id,                // ✅ PatientProfile.id (for value)
// //       userId: p.user.id,       // optional reference to User table
// //       name: p.user.name,       // ✅ Display name
// //       email: p.user.email,
// //     }));

// //     res.json(formatted);
// //   } catch (err) {
// //     console.error("❌ Error fetching patients:", err);
// //     res.status(500).json({ error: "Failed to fetch patients" });
// //   }
// // });

// // Redundant /patients routes removed

// // End of Prescription CRUD (Duplicate code removed)

// // ---------------------------------------------
// // GET /api/doctors — List all doctors
// // ---------------------------------------------
// router.get("/", async (req, res) => {
//   try {
//     const doctors = await prisma.doctorProfile.findMany({
//       select: {
//         id: true,
//         specialization: true,
//         qualifications: true,
//         licenseNumber: true,
//         hospitalAffiliation: true,
//         yearsOfExperience: true,
//         consultationFee: true,
//         bio: true,
//         user: {
//           select: {
//             firstName: true,
//             lastName: true, // ✅ fixed field name
//             email: true,
//           },
//         },
//       },
//       orderBy: { createdAt: "desc" },
//     });

//     const formatted = doctors.map((doc) => ({
//       id: doc.id,
//       name: doc.user.name,
//       specialization: doc.specialization,
//       experience: doc.yearsOfExperience,
//       consultationFee: doc.consultationFee,
//       hospitalAffiliation: doc.hospitalAffiliation,
//       bio: doc.bio,
//     }));

//     res.json(formatted);
//   } catch (error) {
//     console.error("❌ Error fetching doctors:", error);
//     res.status(500).json({ error: "Failed to load doctors" });
//   }
// });

// //=======================================
// // SUBSCRIPTION
// //=======================================
// // POST /api/subscription/stripe/checkout
// // body: { userId, plan: "MONTHLY"|"YEARLY" }
// router.post("/subscription/stripe/checkout", async (_req, res) => {
//   // const { userId, plan } = req.body || {};
//   // Placeholder for stripe checkout logic
//   return res.status(501).json({ message: "Stripe checkout not implemented" });
// });

// module.exports = router;


const express = require("express");
const { verifyToken, requireRole } = require("../middleware/rbac.js");

const prisma = require("../prisma/prismaClient");
const emailService = require("../services/emailService");
const { parseAsLocal } = require("../utils/timeUtils");
const { ensureDefaultProfile } = require("../lib/provisionProfile.js");
const router = express.Router();

// ✅ RBAC — PHYSICIAN_ASSISTANT bhi allow hai ab
router.use(verifyToken);
router.use(requireRole(["DOCTOR", "PHYSICIAN_ASSISTANT", "SUPERADMIN", "ADMIN"]));

// ================================================================
// ✅ HELPER: PA ke liye assigned doctor ka DoctorProfile resolve karo
// Agar user DOCTOR hai → uska apna profile
// Agar user PA hai → assigned doctor ka profile (agar doctor offline ho)
// ================================================================
async function resolveDoctorProfileId(userId, role) {
  if (role === "DOCTOR") {
    const profile = await prisma.doctorProfile.findUnique({
      where: { userId },
      select: { id: true, isOnline: true },
    });
    return { profileId: profile?.id || null, isOnline: profile?.isOnline || false };
  }

  if (role === "PHYSICIAN_ASSISTANT") {
    // PA ka assigned doctor dhundo
    const pa = await prisma.physicianAssistant.findUnique({
      where: { userId },
      include: {
        doctor: {
          select: { id: true, isOnline: true },
        },
      },
    });

    if (!pa) return { profileId: null, isOnline: false, error: "No assigned doctor found for this PA" };

    // REQUIREMENT 3: Jab doctor online hai, PA ko doctor ka profileId mat do
    if (pa.doctor.isOnline) {
      return {
        profileId: null,
        isOnline: true,
        isActingAsPA: true,
        assignedDoctorId: pa.assignedDoctorId,
        error: "Supervising doctor is currently online",
      };
    }

    return {
      profileId: pa.doctor.id,
      isOnline: pa.doctor.isOnline,
      isActingAsPA: true,
      assignedDoctorId: pa.assignedDoctorId,
    };
  }

  return { profileId: null, isOnline: false };
}

// ================================================================
// ✅ GET /api/doctor/pa-status
// PA check kare ke assigned doctor online hai ya nahi
// ================================================================
router.get("/pa-status", async (req, res) => {
  try {
    const userId = req.query.userId || req.user?.id;
    const role = req.user?.role;

    if (role !== "PHYSICIAN_ASSISTANT") {
      return res.json({ isPA: false });
    }

    const pa = await prisma.physicianAssistant.findUnique({
      where: { userId },
      include: {
        doctor: {
          select: {
            id: true,
            isOnline: true,
            lastSeenAt: true,
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    if (!pa) {
      return res.json({
        isPA: true,
        hasAssignedDoctor: false,
        doctorOnline: false,
      });
    }

    return res.json({
      isPA: true,
      hasAssignedDoctor: true,
      doctorOnline: pa.doctor.isOnline,
      lastSeenAt: pa.doctor.lastSeenAt,
      doctorName: `${pa.doctor.user.firstName} ${pa.doctor.user.lastName}`,
      doctorProfileId: pa.doctor.id,
    });
  } catch (err) {
    console.error("PA status error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ================================================================
// ✅ GET /api/doctor/assign-pa
// Admin: PA ko doctor ke saath link karo
// POST /api/doctor/assign-pa { paUserId, doctorUserId }
// ================================================================
router.post("/assign-pa", async (req, res) => {
  try {
    const { paUserId, doctorUserId } = req.body || {};
    if (!paUserId || !doctorUserId) {
      return res.status(400).json({ error: "paUserId aur doctorUserId dono required hain" });
    }

    // PA user exist karta hai?
    const paUser = await prisma.user.findUnique({
      where: { id: paUserId },
      select: { role: true },
    });
    if (!paUser || paUser.role !== "PHYSICIAN_ASSISTANT") {
      return res.status(400).json({ error: "User PHYSICIAN_ASSISTANT role ka nahi hai" });
    }

    // Doctor profile exist karta hai?
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: doctorUserId },
      select: { id: true },
    });
    if (!doctorProfile) {
      return res.status(404).json({ error: "Doctor profile nahi mila" });
    }

    // Upsert PA assignment
    const assignment = await prisma.physicianAssistant.upsert({
      where: { userId: paUserId },
      update: { assignedDoctorId: doctorProfile.id },
      create: {
        userId: paUserId,
        assignedDoctorId: doctorProfile.id,
      },
    });

    return res.json({ message: "PA successfully assigned to doctor", data: assignment });
  } catch (err) {
    console.error("assign-pa error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ================================================================
// GET /api/doctor/waiting-patients?doctorId=<User.id>
// ================================================================
router.get("/waiting-patients", async (req, res) => {
  try {
    const userId = req.query.doctorId || req.user?.id;
    const role = req.user?.role;
    if (!userId) return res.status(400).json({ error: "doctorId is required" });

    const { profileId } = await resolveDoctorProfileId(userId, role);
    if (!profileId) return res.json([]);

    const waiting = await prisma.appointment.findMany({
      where: {
        doctorId: profileId,
        status: { in: ["CHECKED_IN", "WAITING"] },
      },
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true, firstName: true, lastName: true,
                email: true, phone: true, gender: true, dateOfBirth: true,
              },
            },
          },
        },
      },
      orderBy: { appointmentDate: "asc" },
    });

    return res.json(waiting);
  } catch (err) {
    console.error("waiting-patients error:", err);
    return res.status(500).json({ error: "Failed to fetch waiting patients" });
  }
});

// ================================================================
// GET /api/doctor/stats?doctorId=<User.id>
// ================================================================
router.get("/stats", async (req, res) => {
  try {
    const userId = req.query.doctorId || req.user?.id;
    const role = req.user?.role;
    if (!userId) return res.status(400).json({ error: "doctorId is required" });

    const { profileId } = await resolveDoctorProfileId(userId, role);

    if (!profileId) {
      return res.json({
        totalAppointments: 0, completedAppointments: 0, pendingAppointments: 0,
        totalPrescriptions: 0,
        totalMessages: await prisma.message.count({
          where: { OR: [{ senderId: userId }, { receiverId: userId }] },
        }),
        activePatients: 0,
        urgentFlags: { urgentLabs: 0, unsignedNotes: 0, lateAppointments: 0 },
      });
    }

    const [
      totalAppointments, completedAppointments, pendingAppointments,
      totalPrescriptions, totalMessages, distinctPatients,
    ] = await Promise.all([
      prisma.appointment.count({ where: { doctorId: profileId } }),
      prisma.appointment.count({ where: { doctorId: profileId, status: "COMPLETED" } }),
      prisma.appointment.count({ where: { doctorId: profileId, status: "PENDING" } }),
      prisma.prescription.count({ where: { doctorId: profileId } }),
      prisma.message.count({
        where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      }),
      prisma.appointment.findMany({
        where: { doctorId: profileId },
        distinct: ["patientId"],
        select: { patientId: true },
      }),
    ]);

    const [urgentLabs, unsignedNotes, lateAppointments] = await Promise.all([
      prisma.labOrder.count({ where: { doctorId: profileId, status: "ORDERED" } }),
      prisma.clinicalEncounter.count({ where: { doctorId: profileId, status: "DRAFT" } }),
      prisma.appointment.count({
        where: {
          doctorId: profileId,
          status: { in: ["WAITING", "CHECKED_IN"] },
          appointmentDate: { lt: new Date() },
        },
      }),
    ]);

    // Fetch assigned Physician Assistants for this doctor
    const pas = await prisma.physicianAssistant.findMany({
      where: { assignedDoctorId: profileId },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true }
        }
      }
    });

    return res.json({
      totalAppointments, completedAppointments, pendingAppointments,
      totalPrescriptions, totalMessages,
      activePatients: distinctPatients.length,
      urgentFlags: { urgentLabs, unsignedNotes, lateAppointments },
      assignedPAs: pas.map(p => ({
        id: p.id,
        userId: p.userId,
        name: `${p.user.firstName} ${p.user.lastName}`,
        email: p.user.email
      }))
    });
  } catch (err) {
    console.error("❌ /api/doctor/stats error:", err);
    return res.status(500).json({ error: "Failed to fetch doctor stats" });
  }
});

// ================================================================
// GET /api/doctor/profile?userId=...
// ================================================================
router.get("/profile", async (req, res) => {
  try {
    const userId = req.query.userId || req.user?.id;
    const role = req.user?.role;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    // PA ka case — assigned doctor ka profile return karo
    if (role === "PHYSICIAN_ASSISTANT") {
      const pa = await prisma.physicianAssistant.findUnique({
        where: { userId },
        include: {
          doctor: { include: { user: true } },
        },
      });
      if (pa) return res.json({ data: pa.doctor, isActingAsPA: true });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    let profile = await prisma.doctorProfile.findUnique({
      where: { userId },
      include: { user: true },
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

// ================================================================
// PUT /api/doctor/profile
// ================================================================
router.put("/profile", async (req, res) => {
  try {
    const {
      userId, firstName, middleName, lastName, phone, specialization,
      customProfession, qualifications, licenseNumber, hospitalAffiliation,
      yearsOfExperience, consultationFee, availability, timezone, bio,
      languages, emergencyContact, emergencyContactName, emergencyContactEmail,
    } = req.body || {};

    if (!userId) return res.status(400).json({ error: "userId is required" });

    if (req.user.role === "DOCTOR" && String(req.user.id) !== String(userId)) {
      return res.status(403).json({ error: "Forbidden", message: "You are not authorized to update this profile." });
    }

    const userData = {
      ...(firstName !== undefined && { firstName }),
      ...(middleName !== undefined && { middleName }),
      ...(lastName !== undefined && { lastName }),
      ...(phone !== undefined && { phone }),
      ...(req.body.maritalStatus !== undefined && { maritalStatus: req.body.maritalStatus }),
    };

    if (Object.keys(userData).length > 0) {
      await prisma.user.update({ where: { id: userId }, data: userData });
    }

    const doctorData = {
      ...(specialization !== undefined && { specialization }),
      ...(customProfession !== undefined && { customProfession }),
      ...(qualifications !== undefined && { qualifications }),
      ...(licenseNumber !== undefined && { licenseNumber }),
      ...(hospitalAffiliation !== undefined && { hospitalAffiliation }),
      ...(yearsOfExperience !== undefined && { yearsOfExperience: Number(yearsOfExperience) || 0 }),
      ...(consultationFee !== undefined && { consultationFee: Number(consultationFee) || 0 }),
      ...(availability !== undefined && { availability: typeof availability === "string" ? availability : JSON.stringify(availability) }),
      ...(req.body.timezone !== undefined && { timezone: req.body.timezone }),
      ...(bio !== undefined && { bio }),
      ...(languages !== undefined && { languages: Array.isArray(languages) ? JSON.stringify(languages) : languages }),
      ...(emergencyContact !== undefined && { emergencyContact }),
      ...(emergencyContactName !== undefined && { emergencyContactName }),
      ...(emergencyContactEmail !== undefined && { emergencyContactEmail }),
    };

    const updated = await prisma.doctorProfile.upsert({
      where: { userId },
      update: { ...doctorData },
      create: {
        userId,
        specialization: specialization ?? "General Medicine",
        customProfession: customProfession || null,
        qualifications: qualifications ?? "MBBS",
        licenseNumber: licenseNumber || `LIC-${userId.slice(0, 8).toUpperCase()}`,
        hospitalAffiliation: hospitalAffiliation ?? "",
        yearsOfExperience: yearsOfExperience ?? 0,
        consultationFee: consultationFee ?? 0,
        availability: typeof availability === "string" ? availability : JSON.stringify(availability || {}),
        timezone: timezone ?? "Asia/Karachi",
        bio: bio ?? "",
        languages: Array.isArray(languages) ? JSON.stringify(languages) : (languages ?? JSON.stringify(["English"])),
        emergencyContact: emergencyContact ?? "",
        emergencyContactName: emergencyContactName ?? "",
        emergencyContactEmail: emergencyContactEmail ?? "",
      },
      include: { user: true },
    });

    const userForEmail = await prisma.user.findUnique({ where: { id: userId } });
    if (userForEmail) {
      emailService.sendProfileUpdateConfirmation(userForEmail, "Doctor")
        .catch((err) => console.error("Failed to send profile update email:", err));
    }

    return res.json({ data: updated });
  } catch (e) {
    console.error("❌ doctor profile PUT error:", e);
    return res.status(500).json({ error: "Failed to save profile" });
  }
});

// ================================================================
// GET /api/doctor/list
// ================================================================
router.get("/list", async (_req, res) => {
  try {
    const list = await prisma.doctorProfile.findMany({
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(list);
  } catch (err) {
    console.error("❌ GET /api/doctor/list error:", err);
    res.status(500).json({ error: "Failed to load doctors" });
  }
});

// ================================================================
// GET /api/doctor/my-patients?doctorId=<User.id>
// ================================================================
router.get("/my-patients", async (req, res) => {
  try {
    const userId = req.query.doctorId || req.user?.id;
    const role = req.user?.role;
    if (!userId) return res.status(400).json({ error: "doctorId is required" });

    const { profileId } = await resolveDoctorProfileId(userId, role);
    if (!profileId) return res.json([]);

    const distinct = await prisma.appointment.findMany({
      where: { doctorId: profileId },
      distinct: ["patientId"],
      select: { patientId: true },
    });

    const patientIds = distinct.map((d) => d.patientId);
    if (patientIds.length === 0) return res.json([]);

    const patients = await prisma.patientProfile.findMany({
      where: { id: { in: patientIds } },
      select: {
        id: true, bloodGroup: true, height: true, weight: true,
        allergies: true, medications: true, medicalHistory: true,
        address: true, emergencyContact: true,
        user: {
          select: {
            id: true, firstName: true, lastName: true, email: true,
            phone: true, dateOfBirth: true, gender: true,
          },
        },
        createdAt: true, updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const result = patients.map((p) => ({
      id: p.id,
      name: `${p.user?.firstName || ""} ${p.user?.lastName || ""}`.trim() || "Unknown",
      email: p.user?.email || "",
      gender: p.user?.gender || null,
      dateOfBirth: p.user?.dateOfBirth || null,
      bloodGroup: p.bloodGroup || null,
      profile: p,
    }));

    return res.json(result);
  } catch (err) {
    console.error("❌ /api/doctor/my-patients error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ================================================================
// GET /api/doctor/patient/:id
// ================================================================
router.get("/patient/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patientProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true, email: true,
            phone: true, gender: true, dateOfBirth: true, createdAt: true,
          },
        },
      },
    });
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    return res.json(patient);
  } catch (err) {
    console.error("❌ /api/doctor/patient/:id error:", err);
    return res.status(500).json({ error: "Failed to fetch patient" });
  }
});

// ================================================================
// POST /api/doctor/appointments — Create
// ================================================================
router.post("/appointments", async (req, res) => {
  try {
    const { doctorId, patientId, appointmentDate, reason } = req.body;
    if (!doctorId || !patientId || !appointmentDate) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const role = req.user?.role;
    let resolvedDoctorProfileId;

    if (role === "PHYSICIAN_ASSISTANT") {
      const { profileId, isOnline } = await resolveDoctorProfileId(req.user.id, role);
      if (isOnline) {
        return res.status(403).json({ error: "Supervising doctor is currently online. PAs can only manage appointments when the doctor is offline." });
      }
      if (!profileId) {
        return res.status(400).json({ error: "No assigned doctor found for this PA." });
      }
      resolvedDoctorProfileId = profileId;
    } else {
      const doctorProfile = await prisma.doctorProfile.findUnique({ where: { userId: doctorId } });
      if (!doctorProfile) return res.status(404).json({ error: "Doctor profile not found" });
      resolvedDoctorProfileId = doctorProfile.id;
    }

    const patientProfile = await prisma.patientProfile.findUnique({ where: { id: patientId } });
    if (!patientProfile) return res.status(404).json({ error: "Patient profile not found" });

    const localDate = parseAsLocal(appointmentDate);
    const newAppointment = await prisma.appointment.create({
      data: {
        doctorId: resolvedDoctorProfileId,
        patientId: patientProfile.id,
        appointmentDate: localDate,
        reason,
      },
    });

    await prisma.appointment.update({
      where: { id: newAppointment.id },
      data: { roomName: `appointment-${newAppointment.id}` },
    });

    const finalAppointment = await prisma.appointment.findUnique({
      where: { id: newAppointment.id },
      include: {
        doctor: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } } },
        patient: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, gender: true, dateOfBirth: true } } } },
      },
    });

    if (finalAppointment.doctor?.user && finalAppointment.patient?.user) {
      emailService.sendAppointmentBookingConfirmation(
        finalAppointment, finalAppointment.patient.user, finalAppointment.doctor.user
      ).catch((err) => console.error("Failed to send appointment emails:", err));
    }

    res.status(201).json(newAppointment);
  } catch (error) {
    console.error("❌ Error creating appointment:", error);
    res.status(500).json({ error: "Failed to create appointment" });
  }
});

// ================================================================
// PATCH /api/doctor/appointments/:id — Update
// ================================================================
router.patch("/appointments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { appointmentDate, reason, status } = req.body;
    const role = req.user?.role;

    if (role === "PHYSICIAN_ASSISTANT") {
      const { isOnline } = await resolveDoctorProfileId(req.user.id, role);
      if (isOnline) {
        return res.status(403).json({ error: "Supervising doctor is currently online. PAs can only modify appointments when the doctor is offline." });
      }
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...(appointmentDate && { appointmentDate: parseAsLocal(appointmentDate) }),
        ...(reason && { reason }),
        ...(status && { status }),
      },
      include: {
        doctor: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } } },
        patient: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, gender: true, dateOfBirth: true } } } },
      },
    });

    if (status && updatedAppointment.patient?.user && updatedAppointment.doctor?.user) {
      emailService.sendAppointmentStatusChange(
        updatedAppointment, updatedAppointment.patient.user, updatedAppointment.doctor.user, status
      ).catch((err) => console.error("Failed to send appointment status email:", err));
    }

    res.json(updatedAppointment);
  } catch (error) {
    console.error("❌ Error updating appointment:", error);
    res.status(500).json({ error: "Failed to update appointment" });
  }
});

// ================================================================
// GET /api/doctor/appointments
// ================================================================
router.get("/appointments", async (req, res) => {
  const userId = req.query.doctorId || req.user?.id;
  const role = req.user?.role;
  if (!userId) return res.status(400).json({ error: "doctorId is required" });

  try {
    const { profileId } = await resolveDoctorProfileId(userId, role);
    if (!profileId) return res.status(404).json({ error: "Doctor profile not found" });

    const appointments = await prisma.appointment.findMany({
      where: { doctorId: profileId },
      include: {
        doctor: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } } },
        patient: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, gender: true, dateOfBirth: true } } } },
      },
      orderBy: { appointmentDate: "desc" },
    });

    res.json(appointments);
  } catch (err) {
    console.error("❌ Error fetching doctor appointments:", err);
    res.status(500).json({ error: "Failed to fetch doctor appointments" });
  }
});

// ================================================================
// PATCH /api/doctor/appointments/:id/cancel
// ================================================================
router.patch("/appointments/:id/cancel", async (req, res) => {
  const { id } = req.params;
  const role = req.user?.role;

  if (role === "PHYSICIAN_ASSISTANT") {
    const { isOnline } = await resolveDoctorProfileId(req.user.id, role);
    if (isOnline) {
      return res.status(403).json({ error: "Supervising doctor is currently online. PAs can only cancel appointments when the doctor is offline." });
    }
  }

  try {
    await prisma.appointment.update({ where: { id }, data: { status: "CANCELLED" } });
    res.json({ message: "Appointment cancelled" });
  } catch (err) {
    console.error("❌ Error cancelling appointment:", err);
    res.status(500).json({ error: "Failed to cancel appointment" });
  }
});

// ================================================================
// DELETE /api/doctor/appointments/:id
// ================================================================
router.delete("/appointments/:id", async (req, res) => {
  const role = req.user?.role;

  if (role === "PHYSICIAN_ASSISTANT") {
    const { isOnline } = await resolveDoctorProfileId(req.user.id, role);
    if (isOnline) {
      return res.status(403).json({ error: "Supervising doctor is currently online. PAs can only delete appointments when the doctor is offline." });
    }
  }

  try {
    const { id } = req.params;
    await prisma.appointment.delete({ where: { id } });
    res.json({ message: "Appointment deleted" });
  } catch (error) {
    console.error("❌ Error deleting appointment:", error);
    if (error.code === "P2025") return res.status(404).json({ error: "Appointment not found" });
    res.status(500).json({ error: "Failed to delete appointment" });
  }
});

// ================================================================
// GET /api/doctor/prescriptions
// ================================================================
router.get("/prescriptions", async (req, res) => {
  try {
    const userId = req.query.doctorId || req.user?.id;
    const role = req.user?.role;
    if (!userId) return res.status(400).json({ error: "Doctor ID required" });

    const { profileId } = await resolveDoctorProfileId(userId, role);
    if (!profileId) return res.status(404).json({ error: "Doctor profile not found" });

    const prescriptions = await prisma.prescription.findMany({
      where: { doctorId: profileId },
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

// ================================================================
// POST /api/doctor/prescriptions — Create
// ================================================================
router.post("/prescriptions", async (req, res) => {
  try {
    const { doctorId, patientId, medication, dosage, frequency, duration, notes } = req.body || {};
    const role = req.user?.role;

    if (!patientId || !medication || !dosage || !frequency || !duration) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let doctorProfile;

    if (role === "PHYSICIAN_ASSISTANT") {
      // PA ke liye assigned doctor ka profile use karo
      const { profileId, isOnline } = await resolveDoctorProfileId(req.user.id, role);
      if (isOnline) {
        return res.status(403).json({ error: "Supervising doctor is currently online. PAs can only manage prescriptions when the doctor is offline." });
      }
      if (!profileId) return res.status(404).json({ error: "No assigned doctor found for PA" });
      doctorProfile = await prisma.doctorProfile.findUnique({ where: { id: profileId } });
    } else {
      doctorProfile = await prisma.doctorProfile.findUnique({ where: { userId: doctorId } });
      if (!doctorProfile) {
        doctorProfile = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
      }
    }

    if (!doctorProfile) return res.status(404).json({ error: "Doctor profile not found" });

    const patientProfile = await prisma.patientProfile.findUnique({ where: { id: patientId } });
    if (!patientProfile) return res.status(404).json({ error: "Patient profile not found" });

    const created = await prisma.prescription.create({
      data: {
        doctorId: doctorProfile.id,
        patientId: patientProfile.id,
        medication, dosage, frequency, duration,
        notes: notes ?? null,
      },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
    });

    const selectedMapping = await prisma.selectedPharmacy.findFirst({
      where: { patientId: patientProfile.id },
      orderBy: [{ preferred: "desc" }, { createdAt: "desc" }],
    });

    let finalPrescription = created;
    let targetPharmacyId = req.body.pharmacyId || (selectedMapping ? selectedMapping.pharmacyId : null);

    if (targetPharmacyId) {
      finalPrescription = await prisma.prescription.update({
        where: { id: created.id },
        data: { pharmacyId: targetPharmacyId, dispatchStatus: "SENT", dispatchedAt: new Date() },
        include: {
          doctor: { include: { user: true } },
          patient: { include: { user: true } },
          pharmacy: { include: { user: true } },
        },
      });

      if (finalPrescription.pharmacy?.user?.email) {
        emailService.sendNewPrescriptionNotification(
          finalPrescription, finalPrescription.patient.user,
          finalPrescription.doctor.user, finalPrescription.pharmacy
        ).catch((err) => console.error("Failed to notify pharmacy:", err));
      }
    }

    return res.status(201).json(finalPrescription);
  } catch (error) {
    console.error("❌ Error creating prescription:", error);
    return res.status(500).json({ error: "Failed to create prescription" });
  }
});

// ================================================================
// DELETE /api/doctor/prescriptions/:id
// ================================================================
router.delete("/prescriptions/:id", async (req, res) => {
  const { id } = req.params;
  const role = req.user?.role;

  if (role === "PHYSICIAN_ASSISTANT") {
    const { isOnline } = await resolveDoctorProfileId(req.user.id, role);
    if (isOnline) {
      return res.status(403).json({ error: "Supervising doctor is currently online. PAs can only delete prescriptions when the doctor is offline." });
    }
  }

  try {
    const doctorUserId = req.user?.id;
    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: { doctor: { select: { userId: true } } },
    });

    if (!prescription) return res.status(404).json({ error: "Prescription not found" });

    if (prescription.doctor.userId !== doctorUserId && !["SUPERADMIN", "ADMIN"].includes(req.user?.role)) {
      return res.status(403).json({ error: "Not authorized to delete this prescription" });
    }

    await prisma.prescription.delete({ where: { id } });
    res.json({ message: "Prescription deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting prescription:", err);
    res.status(500).json({ error: "Failed to delete prescription" });
  }
});

// ================================================================
// PATCH /api/doctor/prescriptions/:id — Edit
// ================================================================
router.patch("/prescriptions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const role = req.user?.role;

    if (role === "PHYSICIAN_ASSISTANT") {
      const { isOnline } = await resolveDoctorProfileId(req.user.id, role);
      if (isOnline) {
        return res.status(403).json({ error: "Supervising doctor is currently online. PAs can only edit prescriptions when the doctor is offline." });
      }
    }

    const doctorUserId = req.user?.id;
    const { medication, dosage, frequency, duration, notes, patientId } = req.body;

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: { doctor: { select: { userId: true } } },
    });

    if (!prescription) return res.status(404).json({ error: "Prescription not found" });

    if (prescription.doctor.userId !== doctorUserId && !["SUPERADMIN", "ADMIN"].includes(req.user?.role)) {
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

// ================================================================
// GET /api/doctor/messages/inbox
// ================================================================
router.get("/messages/inbox", async (req, res) => {
  try {
    const userId = req.query.doctorId || req.user?.id;
    const role = req.user?.role;

    // PA ke liye — uska apna inbox + assigned doctor ka bhi
    let receiverIds = [userId];

    if (role === "PHYSICIAN_ASSISTANT") {
      const pa = await prisma.physicianAssistant.findUnique({
        where: { userId },
        include: { doctor: { select: { userId: true } } },
      });
      if (pa?.doctor?.userId) {
        receiverIds.push(pa.doctor.userId);
      }
    }

    const doctorUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!doctorUser) return res.status(404).json({ error: "Doctor user not found" });

    const messages = await prisma.message.findMany({
      where: { receiverId: { in: receiverIds } },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, email: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(messages);
  } catch (err) {
    console.error("❌ GET /api/doctor/messages/inbox error:", err);
    return res.status(500).json({ error: "Failed to load inbox" });
  }
});

// ================================================================
// PATCH /api/doctor/messages/read/:id
// ================================================================
router.patch("/messages/read/:id", async (req, res) => {
  try {
    const id = String(req.params.id);
    const userId = String(req.query.userId || req.user?.id || "");
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const found = await prisma.message.findUnique({ where: { id }, select: { id: true, receiverId: true } });
    if (!found) return res.status(404).json({ error: "Message not found" });
    if (found.receiverId !== userId) return res.status(403).json({ error: "Not allowed" });

    const updated = await prisma.message.update({ where: { id }, data: { readAt: new Date() } });
    res.json({ success: true, data: updated });
  } catch (e) {
    console.error("mark read error", e);
    res.status(500).json({ error: "Failed to mark read" });
  }
});

// ================================================================
// DELETE /api/doctor/messages/delete/:id
// ================================================================
router.delete("/messages/delete/:id", async (req, res) => {
  try {
    const id = String(req.params.id);
    const userId = String(req.query.userId || req.user?.id || "");
    if (!id) return res.status(400).json({ error: "message id is required" });
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const found = await prisma.message.findUnique({ where: { id }, select: { id: true, senderId: true, receiverId: true } });
    if (!found) return res.status(404).json({ error: "Message not found" });
    if (found.senderId !== userId && found.receiverId !== userId) return res.status(403).json({ error: "Not allowed" });

    await prisma.message.delete({ where: { id } });
    return res.json({ success: true });
  } catch (err) {
    console.error("❌ DELETE /doctor/messages/delete/:id error:", err);
    return res.status(500).json({ error: "Failed to delete message" });
  }
});

// ================================================================
// POST /api/doctor/messages/send
// ================================================================
router.post("/messages/send", async (req, res) => {
  try {
    const { senderId, receiverId, content } = req.body || {};
    if (!senderId || !receiverId || !content) {
      return res.status(400).json({ error: "senderId, receiverId and content are required" });
    }

    const [sender, receiver] = await Promise.all([
      prisma.user.findUnique({ where: { id: String(senderId) }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: String(receiverId) }, select: { id: true } }),
    ]);
    if (!sender || !receiver) return res.status(400).json({ error: "Invalid sender or receiver" });

    const created = await prisma.message.create({
      data: { senderId: String(senderId), receiverId: String(receiverId), content: String(content), readAt: null },
    });

    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error("❌ POST /doctor/messages/send error:", err);
    return res.status(500).json({ error: "Failed to send message" });
  }
});

// ================================================================
// GET /api/doctor/ — All doctors list
// ================================================================
router.get("/", async (req, res) => {
  try {
    const doctors = await prisma.doctorProfile.findMany({
      select: {
        id: true, specialization: true, qualifications: true, licenseNumber: true,
        hospitalAffiliation: true, yearsOfExperience: true, consultationFee: true, bio: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = doctors.map((doc) => ({
      id: doc.id,
      name: `${doc.user.firstName} ${doc.user.lastName}`.trim(),
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

module.exports = router;