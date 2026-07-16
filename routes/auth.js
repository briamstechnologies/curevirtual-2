// FILE: backend/routes/auth.js
const express = require("express");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma/prismaClient");
const { ensureDefaultProfile } = require("../lib/provisionProfile");
const { supabaseAdmin } = require("../lib/supabaseAdmin");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// -------------------------
// Register (Admin Bypass API)
// -------------------------
router.post("/register", async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      email,
      password,
      role,
      dateOfBirth,
      gender,
      maritalStatus,
      specialization,
    } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required" });
    }

    const normedEmail = String(email).trim().toLowerCase();

    if (!supabaseAdmin) {
      return res.status(501).json({ error: "Supabase Admin client not configured" });
    }

    // 1. Create user in Supabase via Admin API (bypasses email confirmation)
    const { data: sbData, error: sbError } = await supabaseAdmin.auth.admin.createUser({
      email: normedEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        firstName,
        middleName,
        lastName,
        role,
        dateOfBirth,
        gender,
        maritalStatus,
        specialization,
      },
    });

    if (sbError) {
      console.error("❌ Supabase Admin Create Error:", sbError);
      return res.status(sbError.status || 400).json({ error: sbError.message });
    }

    const supabaseId = sbData.user.id;

    // 2. Create user in Prisma
    let user;
    try {
      user = await prisma.user.create({
        data: {
          id: supabaseId,
          firstName: firstName || "First",
          middleName: middleName || null,
          lastName: lastName || "Last",
          email: normedEmail,
          role: role || "PATIENT",
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date(),
          gender: gender || "PREFER_NOT_TO_SAY",
          maritalStatus: maritalStatus || "SINGLE",
        },
      });
    } catch (dbError) {
      console.error("❌ Prisma User Create Error:", dbError);
      // Clean up Supabase user if DB create fails
      await supabaseAdmin.auth.admin.deleteUser(supabaseId);
      return res.status(500).json({ error: "Failed to save user in database", details: dbError.message });
    }

    // 3. Provision profile
    try {
      await ensureDefaultProfile(user, specialization);
    } catch (profileError) {
      console.error("⚠️ Profile provision error:", profileError);
    }

    // 4. Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role, type: "USER" },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    return res.status(201).json({
      message: "Registration successful",
      user,
      token,
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// -------------------------
// Register Success (Supabase Sync)
// -------------------------
router.post("/register-success", async (req, res) => {
  try {
    const {
      supabaseId,
      firstName,
      middleName,
      lastName,
      email,
      phone,
      role,
      dateOfBirth,
      gender,
      maritalStatus,
      specialization,
      country,
    } = req.body || {};

    if (!supabaseId || !email) {
      return res
        .status(400)
        .json({ error: "Missing required fields: supabaseId, email" });
    }

    const normedEmail = String(email).trim().toLowerCase();

    let existingUser;

    // Use upsert to handle concurrent duplicate requests gracefully
    try {
      existingUser = await prisma.user.upsert({
        where: { email: normedEmail },
        update: {
          // If user exists, update fields that might have changed, or keep them
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          phone: phone || undefined,
        },
        create: {
          id: supabaseId, // Use Supabase ID as primary key
          firstName: firstName || "First",
          middleName: middleName || null,
          lastName: lastName || "Last",
          email: normedEmail,
          phone: phone || null,
          password: null, // Supabase manages passwords
          role: role || "PATIENT",
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date(),
          gender: gender || "PREFER_NOT_TO_SAY",
          maritalStatus: maritalStatus || "SINGLE",
        },
      });
      console.log("✅ User upserted successfully in Prisma:", existingUser.id);
    } catch (dbError) {
      console.warn("⚠️ Prisma upsert failed. Attempting fallback lookup / retry...", dbError.message);

      // Fallback: Check if user exists by ID or email
      existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { id: supabaseId },
            { email: normedEmail }
          ]
        }
      });

      if (!existingUser) {
        // Retry creating user one more time
        try {
          existingUser = await prisma.user.create({
            data: {
              id: supabaseId,
              firstName: firstName || "First",
              middleName: middleName || null,
              lastName: lastName || "Last",
              email: normedEmail,
              phone: phone || null,
              password: null,
              role: role || "PATIENT",
              dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date(),
              gender: gender || "PREFER_NOT_TO_SAY",
              maritalStatus: maritalStatus || "SINGLE",
            }
          });
          console.log("✅ User created successfully on retry:", existingUser.id);
        } catch (retryError) {
          console.error("❌ Database create retry failed completely:", retryError);
          // Gracefully return a 200 response with sync_pending status instead of 500
          return res.status(200).json({
            message: "User registered partially, database profile creation pending retry.",
            syncPending: true,
            supabaseId,
            email: normedEmail
          });
        }
      }
    }

    // Provision default profile (Idempotent call)
    if (existingUser) {
      try {
        await ensureDefaultProfile(existingUser, specialization, country);
        console.log("✅ Default profile ensured/created for:", existingUser.role);
      } catch (profileError) {
        console.error(
          "⚠️ Failed to provision default profile (non-blocking):",
          profileError,
        );a
      }
    }

    // Create legacy JWT for backend API
    const token = jwt.sign(
      { id: existingUser.id, role: existingUser.role, type: "USER" },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    return res.status(201).json({
      message: "User synchronized successfully",
      user: existingUser,
      token,
    });
  } catch (err) {
    console.error("Register Sync error:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// -------------------------
// Check Email (Verify & Auto-Clean Stuck Supabase Accounts)
// -------------------------
router.post("/check-email", async (req, res) => {
  try {
    console.log("=== 🔍 [BACKEND DEBUG] EMAIL CHECK INITIATED ===");
    console.log("Request Body Received:", JSON.stringify(req.body, null, 2));
    console.log("Headers Origin Tracker:", req.headers.origin);
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const normedEmail = String(email).trim().toLowerCase();

    // 1. Check in Supabase Auth (auth.users)
    const authUser = await prisma.users.findFirst({
      where: { email: normedEmail }
    });

    if (authUser) {
      if (authUser.email_confirmed_at !== null) {
        // Confirmed auth user -> fully registered
        return res.json({
          exists: true,
          verified: true,
          status: "ALREADY_REGISTERED",
          message: "This email is already fully registered on our platform."
        });
      } else {
        // Unconfirmed auth user -> stuck / incomplete signup
        console.log(`⚠️ Stuck unconfirmed auth user found for ${normedEmail}. Cleaning up...`);
        let cleared = false;

        // Delete from public."User" first to avoid foreign key constraints (if any)
        try {
          await prisma.user.deleteMany({
            where: { email: normedEmail }
          });
          console.log(`✅ Cleaned public.User record for unconfirmed user ${normedEmail}`);
        } catch (dbUserError) {
          console.error(`❌ Failed to delete public.User record for ${normedEmail}:`, dbUserError.message);
        }

        // Delete from auth.users via Supabase Admin API
        if (supabaseAdmin) {
          try {
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id);
            if (deleteError) {
              console.error(`❌ Failed to delete stuck Supabase Auth user ${normedEmail} via API:`, deleteError.message);
            } else {
              console.log(`✅ Auto-cleaned stuck Supabase Auth user via API: ${normedEmail}`);
              cleared = true;
            }
          } catch (cleanError) {
            console.error(`❌ Unexpected error deleting stuck Supabase Auth user ${normedEmail}:`, cleanError);
          }
        }

        // DB Fallback delete if API delete failed or wasn't configured
        if (!cleared) {
          try {
            await prisma.users.delete({
              where: { id: authUser.id }
            });
            console.log(`✅ Auto-cleaned stuck Supabase Auth user via DB fallback: ${normedEmail} (ID: ${authUser.id})`);
            cleared = true;
          } catch (dbDeleteError) {
            console.error(`❌ Failed DB delete fallback for ${normedEmail}:`, dbDeleteError.message);
          }
        }

        return res.json({
          exists: true,
          verified: false,
          status: "PENDING_ACTIVATION",
          cleared,
          message: cleared
            ? "Account pending activation. Stuck session cleared successfully. You can now register again."
            : "Account pending activation but stuck session could not be cleared automatically."
        });
      }
    }

    // 2. Check in our Prisma database (if not found in auth.users)
    const prismaUser = await prisma.user.findUnique({
      where: { email: normedEmail }
    });

    if (prismaUser) {
      // Exist in public.User but NOT in auth.users -> orphaned public User record!
      console.log(`⚠️ Orphaned public.User record found for ${normedEmail} (no auth user). Cleaning up...`);
      try {
        await prisma.user.delete({
          where: { id: prismaUser.id }
        });
        console.log(`✅ Cleaned orphaned public.User record for ${normedEmail}`);
      } catch (dbUserError) {
        console.error(`❌ Failed to delete orphaned public.User record for ${normedEmail}:`, dbUserError.message);
      }
    }

    // 3. Completely fresh user
    return res.json({
      exists: false,
      verified: false,
      status: "NEW_USER",
      message: "Email is available for registration."
    });

  } catch (err) {
    console.error("Check email error:", err);
    return res.status(500).json({
      error: "Internal server error during email check",
      details: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
});


// -------------------------
// Login Sync (Validate Supabase JWT & Sync)
// -------------------------
router.post("/login-sync", async (req, res) => {
  try {
    const { email, supabaseId, supabaseAccessToken } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: "Missing email" });
    }

    const normedEmail = String(email).trim().toLowerCase();

    // Validate Supabase JWT if provided
    if (supabaseAccessToken) {
      const {
        data: { user },
        error,
      } = await supabaseAdmin.auth.getUser(supabaseAccessToken);
      if (error || !user) {
        return res.status(401).json({ error: "Invalid Supabase session" });
      }

      // Check if email is verified
      if (!user.email_confirmed_at) {
        return res.status(403).json({
          error:
            "Email not verified. Please check your email and verify your account before logging in.",
        });
      }
    }

    // Find User in our DB
    let account = await prisma.user.findUnique({
      where: { email: normedEmail },
    });

    if (!account) {
      return res.status(404).json({
        error: "User not found in database. Please complete registration.",
      });
    }

    // Create Legacy JWT for backend API
    const token = jwt.sign(
      { id: account.id, role: account.role, type: "USER" },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    return res.json({
      token,
      user: {
        id: account.id,
        name: `${account.firstName} ${account.lastName}`.trim(),
        role: account.role,
        email: account.email,
        type: "USER",
        approvalStatus: account.approvalStatus ?? "NOT_REQUIRED",
      },
    });
  } catch (err) {
    console.error("Login Sync error:", err);
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
});

// -------------------------
// Request OTP Login (via Supabase)
// -------------------------
router.post("/request-otp-login", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const normedEmail = String(email).trim().toLowerCase();

    // Check if user exists in our DB first
    const user = await prisma.user.findUnique({
      where: { email: normedEmail },
    });

    if (!user) {
      return res
        .status(404)
        .json({ error: "No account found with this email" });
    }

    // Send OTP via Supabase
    const { error } = await supabaseAdmin.auth.signInWithOtp({
      email: normedEmail,
      options: {
        shouldCreateUser: false, // Don't create new users via OTP login
      },
    });

    if (error) {
      console.error("Supabase OTP error:", error);
      return res
        .status(500)
        .json({ error: "Failed to send OTP. Please try again." });
    }

    return res.json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("OTP Request Error:", err);
    return res.status(500).json({ error: "Failed to send OTP" });
  }
});

// -------------------------
// Verify OTP Login (via Supabase)
// -------------------------
router.post("/verify-otp-login", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    const normedEmail = String(email).trim().toLowerCase();

    // Verify OTP with Supabase
    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      email: normedEmail,
      token: otp,
      type: "email",
    });

    if (error || !data.user) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // Get user from our DB
    const user = await prisma.user.findUnique({
      where: { email: normedEmail },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Create JWT
    const token = jwt.sign(
      { id: user.id, role: user.role, type: "USER" },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        role: user.role,
        email: user.email,
        type: "USER",
      },
    });
  } catch (err) {
    console.error("OTP Verification Error:", err);
    return res.status(500).json({ error: "Verification failed" });
  }
});

module.exports = router;
