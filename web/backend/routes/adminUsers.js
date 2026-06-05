// FILE: backend/routes/adminUsers.js

const express = require("express");
const xss = require("xss");
const { verifyToken, requireRole } = require("../middleware/rbac.js");
const prisma = require("../prisma/prismaClient");
const router = express.Router();

// ✅ Utility: Add to activity log
async function addLog(actorId, actorRole, action, entity) {
  try {
    await prisma.activityLog.create({
      data: { actorId, actorRole, action, entity },
    });
  } catch (err) {
    console.error("Activity log failed:", err.message);
  }
}

// ✅ GET all users (Admins + Support)
router.get(
  "/",
  verifyToken,
  requireRole(["SUPERADMIN", "ADMIN"]),
  async (req, res) => {
    try {
      const { role } = req.query;
      const whereClause = role
        ? { role }
        : { role: { in: ["ADMIN", "SUPPORT", "PHYSICIAN_ASSISTANT", "DOCTOR"] } };

      const users = await prisma.user.findMany({
        where: whereClause,
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

      const formattedUsers = users.map((u) => ({
        ...u,
        name: `${u.firstName} ${u.lastName}`.trim(),
      }));

      res.json(formattedUsers);
    } catch (err) {
      console.error("Error fetching admin users:", err);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  },
);

// ✅ POST create new Admin or Support
router.post(
  "/",
  verifyToken,
  requireRole(["SUPERADMIN", "ADMIN"]),
  async (req, res) => {
    try {
      const { name, email, role } = req.body;

      if (!name || !email || !role)
        return res.status(400).json({ error: "Missing required fields" });

      const [firstName, ...lastNameParts] = name.split(" ");
      const lastName = lastNameParts.join(" ") || "Admin";

      const user = await prisma.user.create({
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

      // Log activity
      await addLog(
        req.user?.id || null,
        req.user?.role || "SUPERADMIN",
        "Created User",
        `Admin: ${name}`,
      );
      res.json(user);
    } catch (err) {
      console.error("Error creating admin user:", err);
      res.status(500).json({ error: "Failed to create user" });
    }
  },
);

// ✅ PATCH suspend Admin/Support
router.patch(
  "/:id/suspend",
  verifyToken,
  requireRole(["SUPERADMIN", "ADMIN"]),
  async (req, res) => {
    try {
      const id = req.params.id;
      const updated = await prisma.user.update({
        where: { id },
        data: {
          // User table doesn't have isSuspended yet
        },
      });

      await addLog(
        req.user?.id || null,
        req.user?.role || "SUPERADMIN",
        "Suspended User",
        `Admin ID: ${id}`,
      );
      res.json(updated);
    } catch (err) {
      console.error("Error suspending admin user:", err);
      res.status(500).json({ error: "Failed to suspend user" });
    }
  },
);

// // ✅ DELETE Admin/Support
// router.delete(
//   "/:id",
//   verifyToken,
//   requireRole(["SUPERADMIN", "ADMIN"]),
//   async (req, res) => {
//     try {
//       const id = req.params.id;

//       const deleted = await prisma.user.delete({
//         where: { id },
//       });

//       await addLog(
//         req.user?.id || null,
//         req.user?.role || "SUPERADMIN",
//         "Deleted User",
//         `Admin: ${deleted.name}`,
//       );
//       res.json({ message: "User deleted successfully" });
//     } catch (err) {
//       console.error("Error deleting admin user:", err);
//       res.status(500).json({ error: "Failed to delete user" });
//     }
//     // ✅ NEW: Assign Physician Assistant to a Doctor
//     router.post(
//       "/assign-pa",
//       verifyToken,
//       requireRole(["SUPERADMIN", "ADMIN"]),
//       async (req, res) => {
//         try {
//           const { doctorId, paId } = req.body;

//           if (!doctorId || !paId) {
//             return res.status(400).json({ error: "Doctor ID and PA ID are required" });
//           }

//           // PA ke record mein assignedDoctorId update kar rahe hain
//           const updatedPA = await prisma.user.update({
//             where: { id: paId },
//             data: { assignedDoctorId: doctorId },
//           });

//           // Log activity
//           await addLog(
//             req.user?.id || null,
//             req.user?.role || "SUPERADMIN",
//             "Assigned PA to Doctor",
//             `PA ID: ${paId} assigned to Doctor ID: ${doctorId}`
//           );

//           res.json({ message: "PA assigned successfully", updatedPA });
//         } catch (err) {
//           console.error("Error assigning PA:", err);
//           res.status(500).json({ error: "Failed to assign PA" });
//         }
//       }
//     );
//   },
// );

// ✅ DELETE Admin/Support
router.delete(
  "/:id",
  verifyToken,
  requireRole(["SUPERADMIN", "ADMIN"]),
  async (req, res) => {
    try {
      const id = req.params.id;
      const deleted = await prisma.user.delete({
        where: { id },
      });

      await addLog(
        req.user?.id || null,
        req.user?.role || "SUPERADMIN",
        "Deleted User",
        `Admin: ${deleted.name}`,
      );
      res.json({ message: "User deleted successfully" });
    } catch (err) {
      console.error("Error deleting admin user:", err);
      res.status(500).json({ error: "Failed to delete user" });
    }
  } // <--- Yahan delete block band hona chahiye
);

// ✅ GET all doctors list (for assign-pa modal)
router.get(
  "/doctors",
  verifyToken,
  requireRole(["SUPERADMIN", "ADMIN"]),
  async (req, res) => {
    try {
      const doctors = await prisma.doctorProfile.findMany({
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json(doctors);
    } catch (err) {
      console.error("Error fetching doctors list:", err);
      res.status(500).json({ error: "Failed to fetch doctors" });
    }
  }
);

// ✅ POST: Assign Physician Assistant to a Doctor
router.post(
  "/assign-pa",
  verifyToken,
  requireRole(["SUPERADMIN", "ADMIN"]),
  async (req, res) => {
    try {
      const { paId, doctorId } = req.body;

      if (!paId || !doctorId) {
        return res.status(400).json({ error: "paId aur doctorId dono required hain" });
      }

      // 1) Verify PA user exists aur role PHYSICIAN_ASSISTANT hai
      const paUser = await prisma.user.findUnique({
        where: { id: paId },
        select: { id: true, role: true, firstName: true, lastName: true },
      });
      if (!paUser || paUser.role !== "PHYSICIAN_ASSISTANT") {
        return res.status(400).json({ error: "User PHYSICIAN_ASSISTANT role ka nahi hai" });
      }

      // 2) Doctor profile exist karta hai? (doctorId = User.id)
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: doctorId },
        select: { id: true },
      });
      if (!doctorProfile) {
        return res.status(404).json({ error: "Doctor profile nahi mila" });
      }

      // 3) PhysicianAssistant record upsert karo
      const assignment = await prisma.physicianAssistant.upsert({
        where: { userId: paId },
        update: { assignedDoctorId: doctorProfile.id },
        create: {
          userId: paId,
          assignedDoctorId: doctorProfile.id,
        },
      });

      // 4) Activity log
      await addLog(
        req.user?.id || null,
        req.user?.role || "ADMIN",
        "Assigned PA to Doctor",
        `PA: ${paUser.firstName} ${paUser.lastName} (${paId}) => DoctorProfile: ${doctorProfile.id}`
      );

      res.json({ message: "PA successfully assigned to doctor", data: assignment });
    } catch (err) {
      console.error("Error assigning PA:", err);
      res.status(500).json({ error: "Failed to assign PA" });
    }
  }
);

module.exports = router;

