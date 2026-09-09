// FILE: backend/routes/user.js
const express = require("express");
const router = express.Router();
const prisma = require("../prisma/prismaClient");
const { verifyToken } = require("../middleware/rbac");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const { createClient } = require("@supabase/supabase-js");

const supabase =
  process.env.SUPABASE_URL &&
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
    ? createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
      )
    : null;

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

    // Query avatarUrl from User table
    try {
      const rawUser = await prisma.$queryRawUnsafe(
        'SELECT "avatarUrl" FROM "User" WHERE id = $1',
        id
      );
      if (rawUser && rawUser.length > 0 && rawUser[0].avatarUrl) {
        user.avatarUrl = rawUser[0].avatarUrl;
      }
    } catch (dbErr) {
      console.warn("Could not query avatarUrl directly:", dbErr.message);
    }

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
      avatarUrl,
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

    // Update avatarUrl if provided
    if (avatarUrl !== undefined) {
      try {
        await prisma.$executeRawUnsafe(
          'UPDATE "User" SET "avatarUrl" = $1 WHERE id = $2',
          avatarUrl,
          targetUserId
        );
        updated.avatarUrl = avatarUrl;
      } catch (dbErr) {
        console.warn("Could not update avatarUrl in database:", dbErr.message);
      }
    } else {
      // Query existing avatarUrl
      try {
        const rawUser = await prisma.$queryRawUnsafe(
          'SELECT "avatarUrl" FROM "User" WHERE id = $1',
          targetUserId
        );
        if (rawUser && rawUser.length > 0 && rawUser[0].avatarUrl) {
          updated.avatarUrl = rawUser[0].avatarUrl;
        }
      } catch (dbErr) {
        // silent fallback
      }
    }

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

// POST /api/users/avatar
router.post("/avatar", verifyToken, upload.single("avatar"), async (req, res) => {
  try {
    const userId = req.body?.userId || req.user?.id;
    if (!userId) return res.status(400).json({ error: "User identity missing" });

    // Allow user to upload own avatar or ADMIN/SUPERADMIN
    if (req.user.id !== userId && !["ADMIN", "SUPERADMIN"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    let publicUrl;
    if (supabase) {
      const ext = req.file.originalname.split(".").pop() || "png";
      const fileName = `user-${userId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        console.error("Supabase avatar upload error:", uploadError);
        return res.status(500).json({ error: `Upload failed: ${uploadError.message}` });
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      publicUrl = data.publicUrl;
    } else {
      publicUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }

    // Update in database using raw query
    try {
      await prisma.$executeRawUnsafe(
        'UPDATE "User" SET "avatarUrl" = $1 WHERE id = $2',
        publicUrl,
        String(userId)
      );
    } catch (dbErr) {
      console.warn("Could not update avatarUrl column directly:", dbErr.message);
    }

    return res.json({
      success: true,
      avatarUrl: publicUrl,
      message: "Avatar uploaded and saved successfully",
    });
  } catch (err) {
    console.error("Avatar upload handler error:", err);
    return res.status(500).json({ error: "Internal server error during avatar upload" });
  }
});

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
