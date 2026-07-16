const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { calculatePAAccess } = require("../lib/paAccess");

/**
 * Middleware to enforce PA access controls on specific features.
 * @param {string} requiredFeature - The boolean field name from PhysicianAssistantProfile (e.g., 'canAccessAppointments').
 */
const paAccessControl = (requiredFeature) => {
  return async (req, res, next) => {
    try {
      // We assume requireRole has already verified the token and set req.userId and req.role
      if (req.role !== "PHYSICIAN_ASSISTANT") {
        // If not a PA, this middleware doesn't apply; proceed.
        return next();
      }

      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Find the PA Profile
      const paProfile = await prisma.physicianAssistantProfile.findUnique({
        where: { userId },
        include: {
          assignments: {
            where: { status: "ACTIVE" },
            include: { doctor: true }
          }
        }
      });

      if (!paProfile) {
        return res.status(404).json({ error: "PA Profile not found" });
      }

      // Get supervising doctor from active assignment (assuming 1 active assignment)
      const activeAssignment = paProfile.assignments[0];
      if (!activeAssignment || !activeAssignment.doctor) {
        return res.status(403).json({ error: "No active supervising doctor found." });
      }

      const doctor = activeAssignment.doctor;

      // Calculate permissions
      const permissions = calculatePAAccess(doctor, paProfile);

      // Check if the required feature is granted
      if (permissions[requiredFeature] !== true) {
        return res.status(403).json({
          error: "Access Denied",
          message: `Your supervising doctor is online. You do not have permission to access ${requiredFeature}.`
        });
      }

      // Access granted
      next();
    } catch (error) {
      console.error("[paAccessControl] Error:", error);
      res.status(500).json({ error: "Internal server error during access check." });
    }
  };
};

module.exports = paAccessControl;
