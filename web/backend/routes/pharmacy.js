const express = require("express");
const router = express.Router();
const prisma = require('../prisma/prismaClient');
const { verifyToken, requireRole } = require("../middleware/rbac.js");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const { createClient } = require("@supabase/supabase-js");
const supabase = process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  : null;

const authenticatePharmacy = [verifyToken, requireRole(["PHARMACY", "SUPERADMIN", "ADMIN"])];

/* --------------------------- helpers --------------------------- */
const toNullIfBlank = (v) =>
  v === undefined || v === null || String(v).trim() === "" ? null : String(v).trim();

const toFloatOrNull = (v) => {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Read userId from (token OR query OR body)
function inferUserId(req) {
  if (req.user?.id) return String(req.user.id);
  if (req.query?.userId) return String(req.query.userId);
  if (req.body?.userId) return String(req.body.userId);
  return null;
}

async function resolvePharmacyProfileId(userId) {
  if (!userId) return null;
  let profile = await prisma.pharmacyProfile.findUnique({
    where: { userId: String(userId) },
  });
  if (!profile) {
    const user = await prisma.user.findUnique({ where: { id: String(userId) } });
    if (user && user.role === "PHARMACY") {
      const { ensureDefaultProfile } = require("../lib/provisionProfile");
      profile = await ensureDefaultProfile(user);
    }
  }
  return profile;
}

/* ================================================================
   DASHBOARD STATS
================================================================ */
router.get("/stats", ...authenticatePharmacy, async (req, res) => {
  try {
    const pharmacyUserId = req.user?.id;

    const pharmacyProfile = await resolvePharmacyProfileId(pharmacyUserId);

    if (!pharmacyProfile) {
      return res.json({
        totalPrescriptions: 0,
        pendingPrescriptions: 0,
        dispensedPrescriptions: 0,
        totalCustomers: 0
      });
    }

    // Debug logging to find which query is failing
    console.log("DEBUG: Fetching pharmacy stats for profile:", pharmacyProfile.id);

    try {
        const trailing30Days = new Date();
        trailing30Days.setDate(trailing30Days.getDate() - 30);

        const [
          totalPrescriptions,
          pendingPrescriptions,
          dispensedPrescriptions,
          totalCustomers,
          trailing30Orders,
          activeSub,
          recentPrescriptions
        ] = await Promise.all([
          prisma.prescription.count({
            where: { pharmacyId: pharmacyProfile.id }
          }),
          prisma.prescription.count({
            where: {
              pharmacyId: pharmacyProfile.id,
              dispatchStatus: { in: ["SENT", "READY", "NONE"] }
            }
          }),
          prisma.prescription.count({
            where: {
              pharmacyId: pharmacyProfile.id,
              dispatchStatus: "DISPENSED"
            }
          }),
          prisma.selectedPharmacy.count({
            where: { pharmacyId: pharmacyProfile.id }
          }),
          prisma.prescription.count({
            where: {
              pharmacyId: pharmacyProfile.id,
              createdAt: { gte: trailing30Days }
            }
          }),
          prisma.userSubscription.findFirst({
            where: {
              userId: pharmacyUserId,
              status: "active",
              expiresAt: { gt: new Date() }
            },
            include: { plan: true }
          }),
          prisma.prescription.findMany({
            where: { pharmacyId: pharmacyProfile.id },
            take: 10,
            orderBy: { createdAt: "desc" },
            include: {
              patient: {
                include: { user: { select: { firstName: true, lastName: true } } }
              }
            }
          })
        ]);

        // Spec Section 5 Volume Tier Calculations for Pharmacy
        const isSubscribed = !!activeSub;
        let tierName = "Tier 1 (0–49 Orders)";
        let commissionPct = 15;
        let nextTierMin = 50;
        let ordersToNextTier = Math.max(0, 50 - trailing30Orders);
        let progressPct = Math.min(100, Math.round((trailing30Orders / 50) * 100));

        if (isSubscribed) {
          tierName = "Pharmacy Partner Plan (Pro Subscribed)";
          commissionPct = activeSub.plan?.commissionRateOverride || 8;
          nextTierMin = null;
          ordersToNextTier = 0;
          progressPct = 100;
        } else if (trailing30Orders >= 200) {
          tierName = "Tier 3 (200+ Orders)";
          commissionPct = 10;
          nextTierMin = null;
          ordersToNextTier = 0;
          progressPct = 100;
        } else if (trailing30Orders >= 50) {
          tierName = "Tier 2 (50–199 Orders)";
          commissionPct = 12;
          nextTierMin = 200;
          ordersToNextTier = Math.max(0, 200 - trailing30Orders);
          progressPct = Math.min(100, Math.round(((trailing30Orders - 50) / 150) * 100));
        }

        // Financial Earnings Calculation
        let grossEarningsGHS = 0;
        let platformFeesGHS = 0;

        const formattedOrders = recentPrescriptions.map((rx) => {
          const amountGHS = rx.totalCost || rx.priceGHS || 120;
          const feeGHS = amountGHS * (commissionPct / 100);
          const netPayoutGHS = amountGHS - feeGHS;

          grossEarningsGHS += amountGHS;
          platformFeesGHS += feeGHS;

          return {
            id: rx.id,
            medicationName: rx.medicationName || rx.medicines || "Prescription Fulfillment",
            patientName: rx.patient?.user ? `${rx.patient.user.firstName} ${rx.patient.user.lastName}`.trim() : "Patient",
            dispatchStatus: rx.dispatchStatus,
            createdAt: rx.createdAt,
            amountGHS,
            commissionPct,
            platformFeeGHS: feeGHS,
            netPayoutGHS
          };
        });

        const netEarningsGHS = grossEarningsGHS - platformFeesGHS;

        res.json({
          success: true,
          totalPrescriptions,
          pendingPrescriptions,
          dispensedPrescriptions,
          totalCustomers,
          trailing30Orders,
          grossEarningsGHS,
          platformFeesGHS,
          netEarningsGHS,
          volumeTier: {
            tierName,
            commissionPct,
            isSubscribed,
            nextTierMin,
            ordersToNextTier,
            progressPct
          },
          recentOrders: formattedOrders
        });
    } catch (innerErr) {
        console.error("DEBUG: Inner error in pharmacy stats queries:", innerErr);
        throw innerErr; 
    }
  } catch (err) {
    console.error("Failed to fetch pharmacy stats:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

/**
 * POST /api/pharmacy/avatar (Upload/Replace Pharmacy Avatar/Logo)
 */
router.post("/avatar", upload.single("avatar"), async (req, res) => {
  try {
    const userId = req.user?.id || req.body?.userId;
    if (!userId) return res.status(400).json({ error: "User identity missing" });

    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    let publicUrl;
    if (supabase) {
      const ext = req.file.originalname.split(".").pop() || "png";
      const fileName = `pharmacy-${userId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (!uploadError) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      } else {
        console.warn("Supabase pharmacy avatar upload warning:", uploadError.message);
      }
    }
    if (!publicUrl) {
      publicUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }

    // Save in DB
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET "avatarUrl" = $1 WHERE id = $2`,
        publicUrl,
        String(userId)
      ).catch(() => {});
      await prisma.$executeRawUnsafe(
        `UPDATE "PharmacyProfile" SET "avatarUrl" = $1 WHERE "userId" = $2`,
        publicUrl,
        String(userId)
      ).catch(() => {});
    } catch (dbErr) {
      console.warn("Could not update pharmacy avatar in db:", dbErr.message);
    }

    return res.json({
      success: true,
      avatarUrl: publicUrl,
      message: "Pharmacy photo uploaded and saved successfully",
    });
  } catch (err) {
    console.error("Pharmacy avatar upload error:", err);
    return res.status(500).json({ error: "Internal server error during avatar upload" });
  }
});

/* ================================================================
   GET /pharmacy/profile?userId=...
   - Ensures a profile exists for the user (auto-creates minimal row)
================================================================ */
router.get("/profile", ...authenticatePharmacy, async (req, res) => {
  try {
    const userId = inferUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // Helper
    const isUuid = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    // Ensure user exists
    if (!isUuid(userId)) {
      return res.status(400).json({ error: "Invalid userId format" });
    }

    const user = await prisma.user.findUnique({
      where: { id: String(userId) },
      select: { id: true, role: true, email: true, firstName: true, lastName: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Get or create profile
    let profile = await prisma.pharmacyProfile.findUnique({
      where: { userId: String(userId) },
      include: { user: true },
    });

    if (!profile || !profile.referenceId) {
      const { ensureDefaultProfile } = require("../lib/provisionProfile");
      const countryArg = req.query?.country || profile?.country || user?.country || "GH";
      await ensureDefaultProfile(user, null, countryArg);
      profile = await prisma.pharmacyProfile.findUnique({
        where: { userId: String(userId) },
        include: { user: true },
      });
    }

    const isApproved = user?.approvalStatus === "APPROVED" || profile?.verificationStatus === "VERIFIED" || profile?.verificationStatus === "APPROVED";
    if (isApproved && profile && profile.verificationStatus !== "VERIFIED") {
      await prisma.pharmacyProfile.update({
        where: { id: profile.id },
        data: { verificationStatus: "VERIFIED" },
      }).catch(() => {});
    }

    const avatarRows = await prisma.$queryRawUnsafe(
      `SELECT "avatarUrl" FROM "User" WHERE id = $1 LIMIT 1`,
      String(userId)
    ).catch(() => []);
    const userAvatarUrl = avatarRows && avatarRows.length > 0 ? avatarRows[0].avatarUrl : null;

    const pharmAvatarRows = await prisma.$queryRawUnsafe(
      `SELECT "avatarUrl" FROM "PharmacyProfile" WHERE "userId" = $1 LIMIT 1`,
      String(userId)
    ).catch(() => []);
    const pharmAvatarUrl = pharmAvatarRows && pharmAvatarRows.length > 0 ? pharmAvatarRows[0].avatarUrl : null;

    const finalAvatar = pharmAvatarUrl || userAvatarUrl || profile?.avatarUrl || null;
    const statusVal = isApproved ? "VERIFIED" : (profile?.verificationStatus || "PENDING");
    const enrichedProfile = profile ? {
      ...profile,
      avatarUrl: finalAvatar,
      referenceId: profile.referenceId,
      reference_id: profile.referenceId,
      verificationStatus: statusVal,
      verification_status: statusVal,
      user: {
        ...profile.user,
        avatarUrl: finalAvatar,
      }
    } : null;

    return res.json({ success: true, data: enrichedProfile });
  } catch (err) {
    console.error("GET /pharmacy/profile error:", err);
    return res.status(500).json({ error: "Failed to load profile" });
  }
});

/* ================================================================
   PUT /pharmacy/profile
   Body: {
     userId, displayName?, licenseNumber?, phone?, address?, city?,
     state?, country?, postalCode?, latitude?, longitude?,
     openingHours?, services?
   }
   - Upserts the profile and returns a success message (for toast)
================================================================ */
router.put("/profile", verifyToken, async (req, res) => {
  try {
    const userId = inferUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // Ensure user exists
    const user = await prisma.user.findUnique({
      where: { id: String(userId) },
      select: { id: true, role: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    console.log(`[RBAC] Incoming Pharmacy Profile Update - UserID: ${userId}, TokenID: ${req.user.id}, Role: ${req.user.role}, Timezone: ${req.body.timezone}`);

    if (req.user.role === "PHARMACY" && String(req.user.id) !== String(userId)) {
      console.warn(`[RBAC] 🛡️ Blocked pharmacy profile update attempt. Request ID: ${userId}, Token ID: ${req.user.id}`);
      return res.status(403).json({ 
        error: "Forbidden", 
        message: "You are not authorized to update this profile." 
      });
    }

    const {
      displayName,
      licenseNumber,
      phone,
      firstName,
      lastName,
      address,
      city,
      state,
      country,
      postalCode,
      latitude,
      longitude,
      openingHours,
      services,
      maritalStatus,
      timezone,
    } = req.body || {};

    const data = {
      displayName: toNullIfBlank(displayName),
      licenseNumber: toNullIfBlank(licenseNumber),
      phone: toNullIfBlank(phone),
      address: toNullIfBlank(address),
      city: toNullIfBlank(city),
      state: toNullIfBlank(state),
      country: toNullIfBlank(country),
      postalCode: toNullIfBlank(postalCode),
      latitude: toFloatOrNull(latitude),
      longitude: toFloatOrNull(longitude),
      openingHours: toNullIfBlank(openingHours),
      services: toNullIfBlank(services),
      timezone: timezone || undefined,
      updatedAt: new Date(),
    };

    // ✅ Sync User Phone & Name if provided
    const userData = {};
    if (phone) userData.phone = String(phone).trim();
    if (firstName) userData.firstName = String(firstName).trim();
    if (lastName) userData.lastName = String(lastName).trim();
    if (maritalStatus) userData.maritalStatus = maritalStatus;

    if (Object.keys(userData).length > 0) {
      await prisma.user.update({
        where: { id: String(userId) },
        data: userData
      });
    }

    const saved = await prisma.pharmacyProfile.upsert({
      where: { userId: String(userId) },
      update: data,
      create: { userId: String(userId), ...data },
      include: { user: true },
    });

    return res.json({
      success: true,
      message: "✅ Profile saved",
      data: saved,
    });
  } catch (err) {
    console.error("PUT /pharmacy/profile error:", err);
    return res.status(500).json({ error: "Failed to save profile" });
  }
});

/* ================================================================
   GET /pharmacy/prescriptions?userId=...
   (dashboard counts / list)
================================================================ */
router.get("/prescriptions", verifyToken, requireRole(["PHARMACY", "ADMIN", "SUPERADMIN"]), async (req, res) => {
  try {
    const userId = inferUserId(req);
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const pharm = await resolvePharmacyProfileId(userId);
    if (!pharm) return res.json({ success: true, data: [] });

    // Fetch pending or escalated PA consultation logs to exclude their prescriptions
    const pendingLogs = await prisma.consultationLog.findMany({
      where: {
        status: { in: ["PENDING_REVIEW", "Returned for Correction", "ESCALATED"] }
      },
      select: { patientId: true, doctorId: true }
    });

    const excludeFilters = pendingLogs.map(log => ({
      AND: [
        { patientId: log.patientId },
        { doctorId: log.doctorId }
      ]
    }));

    const reqStatus = req.query.status ? String(req.query.status).trim().toUpperCase() : null;
    let statusFilter = undefined;
    if (reqStatus) {
      if (reqStatus === "INCOMING") {
        statusFilter = { in: ["SENT", "PENDING"] };
      } else {
        statusFilter = reqStatus;
      }
    }

    const list = await prisma.prescription.findMany({
      where: {
        pharmacyId: pharm.id,
        ...(statusFilter ? { dispatchStatus: statusFilter } : {}),
        ...(excludeFilters.length > 0 && {
          NOT: {
            OR: excludeFilters
          }
        })
      },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, data: list });
  } catch (err) {
    console.error("GET /pharmacy/prescriptions error:", err);
    return res.status(500).json({ error: "Failed to load prescriptions" });
  }
});

/* ================================================================
   BONUS: pharmacy dispatch status updates
   PATCH /pharmacy/prescriptions/:id/status { dispatchStatus }
   dispatchStatus: "ACKNOWLEDGED" | "READY" | "DISPENSED" | "REJECTED"
================================================================ */
router.patch("/prescriptions/:id/status", verifyToken, requireRole(["PHARMACY", "ADMIN", "SUPERADMIN"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { dispatchStatus } = req.body || {};
    const allowed = ["ACKNOWLEDGED", "READY", "DISPENSED", "REJECTED"];

    if (!allowed.includes(String(dispatchStatus))) {
      return res.status(400).json({ error: "Invalid dispatchStatus value" });
    }

    const updated = await prisma.prescription.update({
      where: { id: String(id) },
      data: {
        dispatchStatus,
        dispatchedAt:
          dispatchStatus === "ACKNOWLEDGED" ||
          dispatchStatus === "READY" ||
          dispatchStatus === "DISPENSED"
            ? new Date()
            : null,
      },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
        pharmacy: true,
      },
    });

    return res.json({ success: true, message: "✅ Status updated", data: updated });
  } catch (err) {
    console.error("PATCH /pharmacy/prescriptions/:id/status error:", err);
    return res.status(500).json({ error: "Failed to update dispatch status" });
  }

});

/* ================================================================
   DELETE /pharmacy/prescriptions/:id
   - Delete a prescription (e.g. if created in error or rejected)
================================================================ */
router.delete("/prescriptions/:id", verifyToken, requireRole(["PHARMACY", "ADMIN", "SUPERADMIN"]), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.prescription.delete({ where: { id: String(id) } });
    return res.json({ success: true, message: "✅ Prescription deleted" });
  } catch (err) {
    console.error("DELETE /pharmacy/prescriptions/:id error:", err);
    return res.status(500).json({ error: "Failed to delete prescription" });
  }
});

/* ================================================================
   PUT /pharmacy/prescriptions/:id
   - Edit prescription details (medication, dosage, etc.)
================================================================ */
router.put("/prescriptions/:id", verifyToken, requireRole(["PHARMACY", "ADMIN", "SUPERADMIN"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { medication, dosage, frequency, duration, notes } = req.body || {};

    const updated = await prisma.prescription.update({
      where: { id: String(id) },
      data: {
        medication,
        dosage,
        frequency,
        duration,
        notes
      },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      }
    });

    return res.json({ success: true, message: "✅ Prescription updated", data: updated });
  } catch (err) {
    console.error("PUT /pharmacy/prescriptions/:id error:", err);
    return res.status(500).json({ error: "Failed to update prescription" });
  }
});

/* ================================================================
   GET /pharmacy/list — List all pharmacies
   Used by patient pharmacy list page
================================================================ */
router.get("/list", async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    const pharmacies = await prisma.pharmacyProfile.findMany({
      include: { 
        user: {
          select: {
            id: true,
            firstName: true, lastName: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    // Format for frontend
    const items = pharmacies.map(p => ({
      id: p.id,
      name: p.displayName || (p.user ? `${p.user.firstName} ${p.user.lastName}`.trim() : "Unnamed Pharmacy"),
      email: p.user?.email,
      phone: p.phone,
      address: p.address,
      city: p.city,
      state: p.state,
      country: p.country,
      latitude: p.latitude,
      longitude: p.longitude,
      openingHours: p.openingHours,
      services: p.services,
      licenseNumber: p.licenseNumber,
      pharmacyProfile: p, // Include full profile for modal
    }));

    return res.json({ success: true, data: { items } });
  } catch (err) {
    console.error("GET /pharmacy/list error:", err);
    return res.status(500).json({ error: "Failed to load pharmacy list" });
  }
});


// GET /api/pharmacy/patient/selected?patientId=...
router.get("/patient/selected", async (req, res) => {
  try {
    const { patientId } = req.query;
    if (!patientId) return res.status(400).json({ error: "patientId is required" });

    const pid = await prisma.patientProfile.findUnique({
      where: { userId: String(patientId) },
      select: { id: true }
    });
    if (!pid) return res.json({ success: true, data: [] });

    const selected = await prisma.selectedPharmacy.findMany({
      where: { patientId: pid.id },
      include: { 
        pharmacy: { 
          include: { 
            user: { select: { firstName: true, lastName: true, email: true } } 
          } 
        } 
      },
      orderBy: { createdAt: "desc" }
    });

    const items = selected.map(s => ({
      mapId: s.id,
      pharmacyId: s.pharmacyId,
      preferred: s.preferred,
      name: s.pharmacy.displayName || (s.pharmacy.user ? `${s.pharmacy.user.firstName} ${s.pharmacy.user.lastName}`.trim() : "Pharmacy"),
      address: s.pharmacy.address,
      email: s.pharmacy.user.email,
      pharmacyProfile: s.pharmacy
    }));

    res.json({ success: true, data: items });
  } catch(err) {
    console.error("GET /patient/selected error:", err);
    res.status(500).json({ error: "Failed to load selected list" });
  }
});

// POST /api/pharmacy/patient/select
router.post("/patient/select", verifyToken, async (req, res) => {
  try {
    const { patientId, pharmacyId } = req.body;
    if (!patientId || !pharmacyId) return res.status(400).json({ error: "Missing ids" });

    const pat = await prisma.patientProfile.findUnique({ where: { userId: String(patientId) } });
    if (!pat) return res.status(404).json({ error: "Patient profile not found" });

    // Check if exists
    const existing = await prisma.selectedPharmacy.findUnique({
      where: {
        patientId_pharmacyId: { patientId: pat.id, pharmacyId: String(pharmacyId) }
      }
    });

    if (existing) {
      return res.status(400).json({ error: "Already added to your list" });
    }

    await prisma.selectedPharmacy.create({
      data: {
        patientId: pat.id,
        pharmacyId: String(pharmacyId)
      }
    });

    res.json({ success: true, message: "Added to list" });
  } catch(err) {
    console.error("POST /patient/select error:", err);
    res.status(500).json({ error: "Failed to add pharmacy" });
  }
});

// DELETE /api/pharmacy/patient/select/:mapId
router.delete("/patient/select/:mapId", verifyToken, async (req, res) => {
  try {
    const { mapId } = req.params;
    await prisma.selectedPharmacy.delete({ where: { id: mapId } });
    res.json({ success: true, message: "Removed" });
  } catch(err) {
    res.status(500).json({ error: "Failed to remove" });
  }
});

// PATCH /api/pharmacy/patient/select/:mapId/preferred
router.patch("/patient/select/:mapId/preferred", verifyToken, async (req, res) => {
  try {
    const { mapId } = req.params;
    const { preferred } = req.body;

    // Optional: unset others if you want only one preferred
    if (preferred) {
      const current = await prisma.selectedPharmacy.findUnique({ where: { id: mapId } });
      if (current) {
        await prisma.selectedPharmacy.updateMany({
          where: { patientId: current.patientId },
          data: { preferred: false }
        });
      }
    }

    const updated = await prisma.selectedPharmacy.update({
      where: { id: mapId },
      data: { preferred: Boolean(preferred) }
    });
    res.json({ success: true, data: updated });
  } catch(err) {
    console.error("preference error:", err);
    res.status(500).json({ error: "Failed to update preference" });
  }
});

/* ================================================================
   POST /pharmacy/prescriptions — Create a new prescription
   Requester (Pharmacy) acts as the creator/filler.
   Needs doctorId & patientId.
================================================================ */
router.post("/prescriptions", verifyToken, requireRole(["PHARMACY", "ADMIN", "SUPERADMIN"]), async (req, res) => {
  try {
    const userId = inferUserId(req);
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const pharm = await resolvePharmacyProfileId(userId);
    if (!pharm) return res.status(404).json({ error: "Pharmacy profile not found" });

    const { 
      patientId, doctorId, 
      medication, dosage, frequency, duration, notes 
    } = req.body;

    if (!patientId || !doctorId || !medication) {
      return res.status(400).json({ error: "Patient, Doctor, and Medication are required" });
    }

    const created = await prisma.prescription.create({
      data: {
        pharmacyId: pharm.id,
        patientId,
        doctorId,
        medication,
        dosage,
        frequency,
        duration,
        notes,
        // If Pharmacy creates it, we assume they have it "Received" or "Acknowledged"
        dispatchStatus: "ACKNOWLEDGED", 
        dispatchedAt: new Date(),
      },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      }
    });

    return res.json({ success: true, message: "✅ Prescription created", data: created });
  } catch (err) {
    console.error("POST /pharmacy/prescriptions error:", err);
    return res.status(500).json({ error: "Failed to create prescription" });
  }
});

/* ================================================================
   GET /pharmacy/doctors-list & /pharmacy/patients-list
   Helpers for the Create Modal
================================================================ */
router.get("/doctors-list", async (_req, res) => {
  try {
    const list = await prisma.doctorProfile.findMany({
      where: {
        user: {
          role: 'DOCTOR'
        }
      },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      take: 100 
    });
    const data = list.map(d => ({
      id: d.id, // DoctorProfile ID
      name: d.user ? `${d.user.firstName} ${d.user.lastName}`.trim() : "Unknown Doctor",
      email: d.user?.email
    }));
    res.json({ success: true, data });
  } catch(e) {
    res.status(500).json({ error: "Failed to load doctors" });
  }
});

router.get("/patients-list", async (_req, res) => {
  try {
    const list = await prisma.patientProfile.findMany({
      where: {
        user: {
          role: 'PATIENT'
        }
      },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      take: 100
    });
    const data = list.map(p => ({
      id: p.id, // PatientProfile ID
      name: p.user ? `${p.user.firstName} ${p.user.lastName}`.trim() : "Unknown Patient",
      email: p.user?.email
    }));
    res.json({ success: true, data });
  } catch(e) {
    res.status(500).json({ error: "Failed to load patients" });
  }
});

module.exports = router;
