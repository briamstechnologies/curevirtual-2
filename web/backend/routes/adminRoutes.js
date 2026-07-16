/**
 * Admin Routes - for ADMIN role (not SUPERADMIN)
 */
const express = require("express");
const prisma = require("../prisma/prismaClient.js");
const { verifyToken, requireHierarchy } = require("../middleware/rbac.js");
const router = express.Router();

router.use(verifyToken);
router.use(requireHierarchy("ADMIN"));

// ✅ GET /api/admin/users
router.get("/users", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const role = req.query.role;
    const where = role ? { role } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Failed to fetch users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ✅ PUT /api/admin/users/:id - user update karo
router.put("/users/:id", async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const [firstName, ...lastNameParts] = name.split(" ");
    const lastName = lastNameParts.join(" ") || "";

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        firstName,
        lastName,
        email,
        role,
      },
    });

    res.json({ ...updated, name: `${updated.firstName} ${updated.lastName}` });
  } catch (err) {
    console.error("Failed to update user:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});


// ✅ PATCH /api/admin/users/:id/suspend
router.patch("/users/:id/suspend", async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === "SUPERADMIN") {
      return res.status(403).json({ error: "Cannot suspend SUPERADMIN users" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { updatedAt: new Date() },
    });

    res.json({ success: true, message: "User suspension tracked" });
  } catch (err) {
    console.error("Failed to suspend user:", err);
    res.status(500).json({ error: "Failed to suspend user" });
  }
});

// ✅ GET /api/admin/dashboard
router.get("/dashboard", async (req, res) => {
  try {
    const safeCount = async (fn) => {
      try {
        return await fn();
      } catch (_err) {
        return 0;
      }
    };

    const [
      totalUsers,
      totalDoctors,
      totalPatients,
      totalSupport,
      totalAdmins,
      totalSubscriptions,
      totalMessages,
      totalTickets,
      totalConsultations,
      totalPrescriptions,
    ] = await Promise.all([
      safeCount(() => prisma.user.count()),
      safeCount(() => prisma.user.count({ where: { role: "DOCTOR" } })),
      safeCount(() => prisma.user.count({ where: { role: "PATIENT" } })),
      safeCount(() => prisma.user.count({ where: { role: "SUPPORT" } })),
      safeCount(() => prisma.user.count({ where: { role: "ADMIN" } })),
      safeCount(() => prisma.subscription.count({ where: { status: "ACTIVE" } })),
      safeCount(() => prisma.message.count()),
      safeCount(() => prisma.supportTicket.count()),
      safeCount(() => prisma.videoConsultation.count()),
      safeCount(() => prisma.prescription.count()),
    ]);

    res.json({
      totalUsers,
      totalAdmins,
      totalDoctors,
      totalPatients,
      totalSupport,
      totalSubscriptions,
      totalMessages,
      totalTickets,
      totalConsultations,
      totalPrescriptions,
      lastUpdated: new Date(),
    });
  } catch (err) {
    console.error("Failed to fetch admin dashboard:", err);
    res.status(500).json({ error: "Failed to fetch dashboard" });
  }
});

// ✅ GET /api/admin/reports
router.get("/reports", async (req, res) => {
  try {
    const reportType = req.query.type || "general";
    let report = {};

    if (reportType === "general" || reportType === "all") {
      report.userStats = {
        doctors: await prisma.user.count({ where: { role: "DOCTOR" } }),
        patients: await prisma.user.count({ where: { role: "PATIENT" } }),
        pharmacies: await prisma.user.count({ where: { role: "PHARMACY" } }),
        support: await prisma.user.count({ where: { role: "SUPPORT" } }),
      };
    }

    if (reportType === "activity" || reportType === "all") {
      report.recentTickets = await prisma.supportTicket.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
      });
    }

    res.json(report);
  } catch (err) {
    console.error("Failed to generate report:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// ✅ GET /api/admin/support-tickets
router.get("/support-tickets", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const where = status ? { status } : {};

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    res.json({
      data: tickets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Failed to fetch support tickets:", err);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

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
      where: { OR: [{ id: doctorId }, { userId: doctorId }] }
    });

    if (!doctorProfile) {
      return res.status(404).json({ error: "Doctor profile nahi mila" });
    }

    const pa = await prisma.physicianAssistantProfile.findFirst({
      where: { OR: [{ id: paId }, { userId: paId }] }
    });

    if (!pa) {
      return res.status(404).json({ error: "PA record nahi mila" });
    }

    let assignment = await prisma.doctorPAAssignment.findFirst({
      where: {
        doctorId: doctorProfile.id,
        paId: pa.id,
        assignmentStatus: "ACTIVE"
      }
    });

    if (!assignment) {
      assignment = await prisma.doctorPAAssignment.create({
        data: {
          doctorId: doctorProfile.id,
          paId: pa.id,
          assignmentStatus: "ACTIVE",
          createdBy: "ADMIN",
        }
      });
    }

    res.json({ success: true, data: assignment });
  } catch (err) {
    console.error("❌ Assign PA error:", err);
    res.status(500).json({ error: "Failed to assign PA" });
  }
});

// ✅ POST /api/admin/remove-pa
router.post("/remove-pa", async (req, res) => {
  try {
    const { paId, doctorId } = req.body;

    const doctorProfile = await prisma.doctorProfile.findFirst({
      where: { OR: [{ id: doctorId }, { userId: doctorId }] }
    });

    if (!doctorProfile) {
      return res.status(404).json({ error: "Doctor profile nahi mila" });
    }

    const pa = await prisma.physicianAssistantProfile.findFirst({
      where: { OR: [{ id: paId }, { userId: paId }] }
    });

    if (!pa) {
      return res.status(404).json({ error: "PA record nahi mila" });
    }

    const assignment = await prisma.doctorPAAssignment.findFirst({
      where: {
        doctorId: doctorProfile.id,
        paId: pa.id,
        assignmentStatus: "ACTIVE"
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: "Active assignment nahi mili" });
    }

    await prisma.doctorPAAssignment.update({
      where: { id: assignment.id },
      data: {
        assignmentStatus: "REMOVED",
        removedAt: new Date()
      }
    });

    res.json({ success: true, message: "PA successfully removed from doctor" });
  } catch (err) {
    console.error("❌ Remove PA error:", err);
    res.status(500).json({ error: "Failed to remove PA" });
  }
});

module.exports = router;
