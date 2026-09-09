// FILE: backend/routes/user.js
const express = require("express");
const router = express.Router();
const prisma = require("../prisma/prismaClient");
const { verifyToken } = require("../middleware/rbac");
const bcrypt = require("bcryptjs");

// GET /api/users/:id
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const id = req.params.id;

    // Check USER table first
    let user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        role: true,
        email: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        maritalStatus: true,
        createdAt: true,
      },
    });

    if (!user)
      return res.status(404).json({ error: "Identity not found in registry." });

    return res.json({ data: user });
  } catch (e) {
    console.error("❌ user profile error:", e);
    return res.status(500).json({ error: "Failed to load user intelligence" });
  }
});

// GET /api/users (Keep existing list functionality)
router.get("/", verifyToken, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || "200", 10), 1000);
    const q = (req.query.q || "").trim();

    const where = q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {};

    const users = await prisma.user.findMany({
      where,
      take: limit,
      orderBy: { firstName: "asc" },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        role: true,
        email: true,
      },
    });

    return res.json({ data: users });
  } catch (e) {
    console.error("❌ users list error:", e);
    return res.status(500).json({ error: "Failed to load users" });
  }
});

// Helper function to update user profile
async function updateUserProfile(targetUserId, req, res) {
  try {
    // Only allow updating own profile, unless caller is ADMIN or SUPERADMIN
    if (req.user.id !== targetUserId && !["ADMIN", "SUPERADMIN"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized to update this user profile" });
    }

    const {
      firstName,
      middleName,
      lastName,
      email,
      phone,
      gender,
      dateOfBirth,
      maritalStatus,
      password,
    } = req.body;

    const data = {};
    if (firstName !== undefined) data.firstName = firstName.trim();
    if (middleName !== undefined) data.middleName = middleName ? middleName.trim() : null;
    if (lastName !== undefined) data.lastName = lastName.trim();
    if (phone !== undefined) data.phone = phone ? phone.trim() : null;

    if (gender !== undefined && ["MALE", "FEMALE", "OTHER"].includes(gender)) {
      data.gender = gender;
    }

    if (maritalStatus !== undefined && ["SINGLE", "MARRIED"].includes(maritalStatus)) {
      data.maritalStatus = maritalStatus;
    }

    if (dateOfBirth) {
      const parsedDate = new Date(dateOfBirth);
      if (!isNaN(parsedDate.getTime())) {
        data.dateOfBirth = parsedDate;
      }
    }

    // Email validation & unique check
    if (email && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = await prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          NOT: { id: targetUserId },
        },
      });

      if (existing) {
        return res.status(400).json({ error: "Email is already taken by another account" });
      }
      data.email = normalizedEmail;
    }

    // Optional password change
    if (password && password.trim().length > 0) {
      if (password.trim().length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }
      data.password = await bcrypt.hash(password.trim(), 10);
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data,
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        role: true,
        email: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        maritalStatus: true,
        createdAt: true,
      },
    });

    return res.json({
      success: true,
      message: "Profile updated successfully",
      data: updated,
    });
  } catch (e) {
    console.error("❌ Profile update error:", e);
    return res.status(500).json({ error: e.message || "Failed to update profile" });
  }
}

// PUT /api/users/profile
router.put("/profile", verifyToken, async (req, res) => {
  return updateUserProfile(req.user.id, req, res);
});

// PATCH /api/users/profile
router.patch("/profile", verifyToken, async (req, res) => {
  return updateUserProfile(req.user.id, req, res);
});

// PUT /api/users/:id
router.put("/:id", verifyToken, async (req, res) => {
  return updateUserProfile(req.params.id, req, res);
});

// PATCH /api/users/:id
router.patch("/:id", verifyToken, async (req, res) => {
  return updateUserProfile(req.params.id, req, res);
});

module.exports = router;
