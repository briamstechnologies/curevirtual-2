// FILE: backend/routes/user.js
const express = require("express");
const router = express.Router();
const prisma = require("../prisma/prismaClient");
const { verifyToken } = require("../middleware/rbac");

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
        lastName: true,
        role: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        maritalStatus: true,
        createdAt: true,
      },
    });

    if (!user)
      return res.status(404).json({ error: "Identity not found in registry." });

    return res.json({ data: user });
  } catch (e) {
    console.error("❌ user profile error:", e);
    return res.status(500).json({ error: "Failed to load user" });
  }
});

// GET /api/users (List)
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

// PATCH /api/users/profile
router.patch("/profile", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, phone, dateOfBirth, gender, maritalStatus } = req.body;

    const data = {};
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (phone !== undefined) data.phone = phone;
    if (gender !== undefined) data.gender = gender;
    if (maritalStatus !== undefined) data.maritalStatus = maritalStatus;
    if (dateOfBirth !== undefined) {
      const d = new Date(dateOfBirth);
      if (!isNaN(d.getTime())) data.dateOfBirth = d;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
    });

    return res.json({ success: true, data: updated });
  } catch (e) {
    console.error("❌ profile update error:", e);
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

module.exports = router;
