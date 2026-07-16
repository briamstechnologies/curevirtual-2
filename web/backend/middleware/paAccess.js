// FILE: web/backend/middleware/paAccess.js
const prisma = require("../prisma/prismaClient");

async function enforcePAAccess(req, res, next) {
  try {
    // Only enforce for PA role
    if (req.user?.role !== "PHYSICIAN_ASSISTANT") {
      return next();
    }

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Fetch the PA Profile using raw query to get isAllowedByDoctor
    const rawPa = await prisma.$queryRaw`SELECT "supervisingDoctorId", "isAllowedByDoctor" FROM "PhysicianAssistantProfile" WHERE "userId" = ${userId}`;
    if (!rawPa || rawPa.length === 0) {
      return res.status(404).json({ error: "PA Profile not found" });
    }
    const pa = rawPa[0];

    if (!pa.supervisingDoctorId) {
      return next();
    }

    // Fetch Doctor's isOnline using raw query
    const rawDocs = await prisma.$queryRaw`SELECT "isOnline" FROM "DoctorProfile" WHERE "referenceId" = ${pa.supervisingDoctorId}`;
    if (!rawDocs || rawDocs.length === 0) {
      return next();
    }
    const doctorOnline = rawDocs[0].isOnline;

    if (doctorOnline && !pa.isAllowedByDoctor) {
      return res.status(403).json({ error: "Access Denied: Supervising Doctor is online but has not granted permission." });
    }

    next();
  } catch (err) {
    console.error("PA Access Middleware Error:", err);
    res.status(500).json({ error: "Server error verifying PA access" });
  }
}

module.exports = { enforcePAAccess };
