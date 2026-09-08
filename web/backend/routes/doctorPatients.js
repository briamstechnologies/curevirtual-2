const express = require("express");
const router = express.Router();
const prisma = require('../prisma/prismaClient');
const { verifyToken, requireRole, verifyOwnerOrAdmin } = require("../middleware/rbac.js");

/** Helpers */
async function getDoctorProfileByUserId(doctorUserId) {
  if (!doctorUserId) return null;
  let doc = await prisma.doctorProfile.findUnique({ where: { userId: String(doctorUserId) } });
  if (!doc) {
    // If user is a PA, find their supervising doctor's profile via physicianAssistantProfile
    const pa = await prisma.physicianAssistantProfile.findUnique({ 
      where: { userId: String(doctorUserId) }, 
      include: { assignments: true } 
    });
    if (pa && pa.assignments?.length > 0) {
      doc = await prisma.doctorProfile.findUnique({ where: { id: pa.assignments[0].doctorId } });
    }
  }
  return doc;
}

function dobRangeFromAges(minAge, maxAge) {
  // Age X => DOB <= today - X years (older)
  // Age Y => DOB >= today - Y years (younger)
  const now = new Date();
  let gte, lte;
  if (maxAge) {
    gte = new Date(now);
    gte.setFullYear(gte.getFullYear() - Number(maxAge));
  }
  if (minAge) {
    lte = new Date(now);
    lte.setFullYear(lte.getFullYear() - Number(minAge));
  }
  return { gte, lte };
}

function buildPatientWhere(q, doctorProfileId) {
  const { search, gender, bloodGroup, minAge, maxAge } = q;
  const where = {
    doctorLinks: { some: { doctorId: doctorProfileId } }, // assigned to this doctor
  };

  if (bloodGroup) where.bloodGroup = String(bloodGroup);

  if (gender || minAge || maxAge) {
    where.user = {};
    if (gender) where.user.gender = String(gender);

    if (minAge || maxAge) {
      const { gte, lte } = dobRangeFromAges(minAge, maxAge);
      where.user.dateOfBirth = {};
      if (gte) where.user.dateOfBirth.gte = gte; // younger than or equal to maxAge
      if (lte) where.user.dateOfBirth.lte = lte; // older than or equal to minAge
    }
  }

  if (search) {
    where.OR = [
      { user: { firstName: { contains: String(search), mode: "insensitive" } } },
      { user: { lastName: { contains: String(search), mode: "insensitive" } } },
      { medicalRecordNumber: { contains: String(search), mode: "insensitive" } },
      { address: { contains: String(search), mode: "insensitive" } },
    ];
  }

  return where;
}


/**
 * GET /api/doctor/patients
 * Query:
 *   - doctorUserId (optional, falls back to req.user.id)
 *   - search, gender, bloodGroup, minAge, maxAge (optional)
 * Returns PatientProfile[] with user info
 */
router.get("/doctor/patients", verifyToken, requireRole(["DOCTOR", "PHYSICIAN_ASSISTANT", "ADMIN", "SUPERADMIN"]), async (req, res) => {
  try {
    const doctorUserId = req.query.doctorUserId || req.user?.id;
    if (!doctorUserId) return res.status(400).json({ error: "doctorUserId is required" });

    const doctor = await getDoctorProfileByUserId(doctorUserId);
    if (!doctor) return res.json({ data: [], total: 0, page: 1, totalPages: 0 });

    const where = buildPatientWhere(req.query, doctor.id);

    const page = parseInt(req.query.page) || 1;
    const limitNum = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limitNum;

    const [total, patients] = await Promise.all([
      prisma.patientProfile.count({ where }),
      prisma.patientProfile.findMany({
        where,
        include: { user: true },
        orderBy: [{ createdAt: "desc" }],
        take: limitNum,
        skip,
      })
    ]);

    return res.json({ 
      data: patients,
      total,
      page,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error("❌ /doctor/patients error:", err);
    return res.status(500).json({ error: "Failed to load patients" });
  }
});

/**
 * GET /api/doctor/patient-health-history/:patientId
 * Fetch all health records (manual records, clinical encounters, lab orders) for a specific patient
 */
router.get("/doctor/patient-health-history/:patientId", verifyToken, requireRole(["DOCTOR", "PHYSICIAN_ASSISTANT", "ADMIN", "SUPERADMIN"]), async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!patientId) return res.status(400).json({ error: "patientId is required" });

    // Determine actual patientProfileId
    let profileId = patientId;
    const profile = await prisma.patientProfile.findFirst({
      where: { OR: [{ id: patientId }, { userId: patientId }] }
    });
    if (profile) {
      profileId = profile.id;
    }

    // Fetch manual records
    let manualRecords = [];
    try {
      if (prisma.patientHealthRecord) {
        manualRecords = await prisma.patientHealthRecord.findMany({
          where: { patientId: profileId },
          orderBy: { createdAt: "desc" },
        });
      } else {
        throw new Error("Fallback to raw query");
      }
    } catch (e) {
      manualRecords = await prisma.$queryRaw`
        SELECT * FROM "public"."PatientHealthRecord"
        WHERE "patientId" = ${profileId}
        ORDER BY "createdAt" DESC
      `;
    }

    // Fetch clinical encounters
    let encounters = [];
    try {
      encounters = await prisma.clinicalEncounter.findMany({
        where: { patientId: profileId },
        include: {
          doctor: { include: { user: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (e) {
      console.warn("Could not fetch clinical encounters:", e.message);
    }

    // Fetch lab orders
    let labOrders = [];
    try {
      labOrders = await prisma.labOrder.findMany({
        where: { patientId: profileId },
        include: {
          laboratory: { include: { user: true } },
          doctor: { include: { user: true } },
        },
        orderBy: { orderedAt: "desc" },
      });
    } catch (e) {
      console.warn("Could not fetch lab orders:", e.message);
    }

    // Format manual records
    const formattedManual = (manualRecords || []).map((r) => ({
      id: r.id,
      type: r.type,
      provider: r.provider,
      date: r.date,
      note: r.note,
      icon: r.icon || "clinical_notes",
      source: "MANUAL",
      createdAt: r.createdAt,
    }));

    // Format encounters
    const formattedEncounters = (encounters || []).map((e) => {
      const docName = e.doctor?.user
        ? `Dr. ${e.doctor.user.firstName || ""} ${e.doctor.user.lastName || ""}`.trim()
        : "Clinical Encounter";
      const dateStr = new Date(e.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
      return {
        id: e.id,
        type: "Clinical Consultation",
        provider: docName,
        date: dateStr,
        note: e.assessment || e.plan || e.subjective || "Clinical encounter completed.",
        icon: "medical_services",
        source: "ENCOUNTER",
        createdAt: e.createdAt,
      };
    });

    // Format lab orders
    const formattedLabs = (labOrders || []).map((l) => {
      const labName = l.laboratory?.user
        ? `${l.laboratory.user.firstName || ""} ${l.laboratory.user.lastName || ""}`.trim()
        : "Laboratory";
      const dateStr = new Date(l.completedAt || l.orderedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
      return {
        id: l.id,
        type: `Lab Report: ${l.testName}`,
        provider: labName,
        date: dateStr,
        note: l.resultNotes || "Lab test report.",
        icon: "biotech",
        source: "LAB",
        resultUrl: l.resultUrl,
        createdAt: l.completedAt || l.orderedAt,
      };
    });

    const combined = [...formattedManual, ...formattedEncounters, ...formattedLabs].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.json({ success: true, data: combined });
  } catch (err) {
    console.error("❌ /doctor/patient-health-history error:", err);
    return res.status(500).json({ error: "Failed to fetch patient health history" });
  }
});

module.exports = router;
