const express = require("express");
const xss = require("xss");
const { verifyToken, requireRole } = require("../middleware/rbac"); // ✅ Correct import
const prisma = require("../prisma/prismaClient.js");

const router = express.Router();

// ✅ Apply verification to all routes
router.use(verifyToken);

// ✅ Utility for creating logs
async function addLog(actorId, actorRole, action, entity) {
  try {
    await prisma.activityLog.create({
      data: { actorId, actorRole, action, entity },
    });
  } catch (err) {
    console.error("Failed to write activity log:", err);
  }
}

// ✅ Get all admins (filter by role optional)
// ✅ Get all admins (exclude SUPERADMIN)
router.get("/", requireRole("SUPERADMIN"), async (req, res) => {
  try {
    const { role } = req.query;

    const admins = await prisma.user.findMany({
      where: {
        AND: [
          role ? { role } : { role: { in: ["ADMIN", "SUPPORT"] } },
          { role: { not: "SUPERADMIN" } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedAdmins = admins.map((a) => ({
      ...a,
      name: `${a.firstName} ${a.lastName}`.trim(),
    }));

    res.json(formattedAdmins);
  } catch (err) {
    console.error("Error fetching admins:", err);
    res.status(500).json({ error: "Failed to fetch admins" });
  }
});

// ✅ Create new admin
router.post("/", requireRole("SUPERADMIN"), async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const [firstName, ...lastNameParts] = name.split(" ");
    const lastName = lastNameParts.join(" ") || "Admin";

    const admin = await prisma.user.create({
      data: {
        firstName: xss(firstName),
        lastName: xss(lastName),
        email: xss(email),
        password: "123456", // ❗ hash in production
        role,
        dateOfBirth: new Date("1970-01-01"),
        gender: "PREFER_NOT_TO_SAY",
      },
    });

    await addLog(
      req.user?.id || null,
      req.user?.role || "SYSTEM",
      "Created Admin",
      `Admin: ${name}`,
    );
    res.json(admin);
  } catch (err) {
    console.error("Error creating admin:", err);
    res.status(500).json({ error: "Failed to create admin" });
  }
});

// ✅ Edit admin
router.put("/:id", requireRole("SUPERADMIN"), async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const [firstName, ...lastNameParts] = name.split(" ");
    const lastName = lastNameParts.join(" ") || "";

    const admin = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        firstName: xss(firstName),
        lastName: xss(lastName),
        email: xss(email),
        role,
      },
    });

    await addLog(
      req.user?.id || null,
      req.user?.role || "SYSTEM",
      "Edited Admin",
      `Admin: ${name}`,
    );
    res.json(admin);
  } catch (err) {
    console.error("Error editing admin:", err);
    res.status(500).json({ error: "Failed to edit admin" });
  }
});

// ✅ Suspend admin
router.patch("/:id/suspend", requireRole("SUPERADMIN"), async (req, res) => {
  try {
    const admin = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        // User table doesn't have isSuspended yet
      },
    });

    await addLog(
      req.user?.id || null,
      req.user?.role || "SYSTEM",
      "Suspended Admin",
      `Admin: ${admin.name}`,
    );
    res.json(admin);
  } catch (err) {
    console.error("Error suspending admin:", err);
    res.status(500).json({ error: "Failed to suspend admin" });
  }
});

// ✅ Delete admin
router.delete("/:id", requireRole("SUPERADMIN"), async (req, res) => {
  try {
    const admin = await prisma.user.delete({
      where: { id: req.params.id },
    });

    await addLog(
      req.user?.id || null,
      req.user?.role || "SYSTEM",
      "Deleted Admin",
      `Admin: ${admin.name}`,
    );
    res.json({ message: "Admin deleted successfully" });
  } catch (err) {
    console.error("Error deleting admin:", err);
    res.status(500).json({ error: "Failed to delete admin" });
  }
});

/**
 * ✅ Get all appointments (admin view)
 * GET /api/admin/appointments
 */
router.get("/appointments", async (_req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: {
        doctor: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        patient: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: { appointmentDate: "desc" },
    });

    res.json(appointments);
  } catch (err) {
    console.error("❌ Error fetching appointments:", err);
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

/**
 * ✅ Update appointment status (Approve / Cancel / Complete)
 * PATCH /api/admin/appointments/:id
 */
router.patch("/appointments/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const updated = await prisma.appointment.update({
      where: { id },
      data: { status },
    });
    res.json(updated);
  } catch (err) {
    console.error("❌ Error updating appointment:", err);
    res.status(500).json({ error: "Failed to update appointment" });
  }
});

// ✅ Fetch users (optionally by role)
router.get("/users", async (req, res) => {
  try {
    const { role } = req.query;
    const users = await prisma.user.findMany({
      where: role ? { role } : undefined,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });
    res.json(users);
  } catch (err) {
    console.error("❌ Admin /users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});
// ✅ Assign Physician Assistant to Doctor
router.post(
  "/assign-pa",
  requireRole("SUPERADMIN", "ADMIN"),
  async (req, res) => {
    try {
      const { doctorId, paId } = req.body;

      const doctor = await prisma.user.findUnique({
        where: { id: doctorId },
      });

      const pa = await prisma.user.findUnique({
        where: { id: paId },
      });

      if (!doctor || doctor.role !== "DOCTOR") {
        return res.status(400).json({
          error: "Invalid doctor",
        });
      }

      if (!pa || pa.role !== "PHYSICIAN_ASSISTANT") {
        return res.status(400).json({
          error: "Invalid physician assistant",
        });
      }

      const assignment = await prisma.physicianAssistantDoctor.create({
        data: {
          doctorId,
          paId,
        },
      });

      res.json({
        success: true,
        assignment,
      });
    } catch (err) {
      console.error("❌ Assign PA error:", err);

      res.status(500).json({
        error: "Failed to assign physician assistant",
      });
    }
  },
);

// ✅ Get Doctor Physician Assistants
router.get(
  "/doctor/:doctorId/physician-assistants",
  async (req, res) => {
    try {
      const assistants =
        await prisma.physicianAssistantDoctor.findMany({
          where: {
            doctorId: req.params.doctorId,
          },
          include: {
            assistant: true,
          },
        });

      res.json(assistants);
    } catch (err) {
      console.error("❌ Fetch PA error:", err);

      res.status(500).json({
        error: "Failed to fetch physician assistants",
      });
    }
  },
);
// ✅ GET /api/admin/doctors
router.get("/doctors", async (req, res) => {
  try {
    const doctors = await prisma.doctorProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    const formatted = doctors.map((d) => ({
      id: d.id,
      specialization: d.specialization,
      user: {
        id: d.user.id,
        firstName: d.user.firstName,
        lastName: d.user.lastName,
        email: d.user.email,
      },
    }));

    res.json(formatted);
  } catch (err) {
    console.error("❌ Doctors fetch error:", err);
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
});

// ✅ POST /api/admin/assign-pa
router.post("/assign-pa", async (req, res) => {
  try {
    const { paId, doctorId } = req.body;

    const doctorProfile = await prisma.doctorProfile.findFirst({
      where: { userId: doctorId },
    });

    if (!doctorProfile) {
      return res.status(404).json({ error: "Doctor profile nahi mila" });
    }

    const pa = await prisma.physicianAssistant.findFirst({
      where: { userId: paId },
    });

    if (!pa) {
      return res.status(404).json({ error: "PA record nahi mila" });
    }

    const updated = await prisma.physicianAssistant.update({
      where: { id: pa.id },
      data: { assignedDoctorId: doctorProfile.id },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("❌ Assign PA error:", err);
    res.status(500).json({ error: "Failed to assign PA" });
  }
});

module.exports = router;
