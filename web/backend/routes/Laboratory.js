
// FILE: backend/routes/laboratory.js
const express = require("express");
const router = express.Router();
const prisma = require("../prisma/prismaClient");
const { verifyToken, requireRole } = require("../middleware/rbac.js");
const emailService = require("../services/emailService");
const multer = require("multer");
const { supabaseAdmin } = require("../lib/supabaseAdmin");
const { ensureDefaultProfile } = require("../lib/provisionProfile");

const authenticateLab = [verifyToken, requireRole(["LABORATORY", "SUPERADMIN", "ADMIN"])];

/* --------------------------- multer setup --------------------------- */
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: PDF, JPEG, PNG, WEBP`));
        }
    },
});

/* --------------------------- helpers --------------------------- */
const toNullIfBlank = (v) =>
    v === undefined || v === null || String(v).trim() === "" ? null : String(v).trim();

const toFloatOrNull = (v) => {
    if (v === undefined || v === null || String(v).trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

function inferUserId(req) {
    if (req.user?.id) return String(req.user.id);
    if (req.query?.userId) return String(req.query.userId);
    if (req.body?.userId) return String(req.body.userId);
    return null;
}

async function getOrCreateLabProfile(userId) {
    let lab = await prisma.laboratoryProfile.findUnique({
        where: { userId },
        select: { id: true },
    });
    if (!lab) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user && user.role === "LABORATORY") {
            lab = await prisma.laboratoryProfile.create({
                data: {
                    userId,
                    displayName: `${user.firstName} ${user.lastName}`,
                    licenseNumber: `LAB-${userId.slice(0, 8).toUpperCase()}`,
                },
                select: { id: true },
            });
        }
    }
    return lab;
}


/* ================================================================
   DASHBOARD STATS
   GET /api/laboratory/stats
================================================================ */
router.get("/stats", ...authenticateLab, async (req, res) => {
    try {
        const labUserId = req.query.userId || req.user?.id;

        let labProfile = await prisma.laboratoryProfile.findUnique({
            where: { userId: labUserId },
            select: { id: true },
        });

        if (!labProfile && labUserId) {
            const user = await prisma.user.findUnique({ where: { id: labUserId } });
            if (user) {
                labProfile = await ensureDefaultProfile(user, undefined, undefined);
            }
        }

        if (!labProfile) {
            const emptyPayload = {
                pendingTests: 0,
                reportsUploaded: 0,
                totalPatients: 0,
                earnings: "$0",
                totalOrders: 0,
                pendingOrders: 0,
                completedOrders: 0,
            };
            return res.json({ success: true, data: emptyPayload, ...emptyPayload });
        }

        const trailing30Days = new Date();
        trailing30Days.setDate(trailing30Days.getDate() - 30);

        const [totalOrders, pendingOrders, completedOrders, totalPatients, trailing30Orders, activeSub, RecentOrders] =
            await Promise.all([
                prisma.labOrder.count({
                    where: { laboratoryId: labProfile.id },
                }),
                prisma.labOrder.count({
                    where: {
                        laboratoryId: labProfile.id,
                        status: { in: ["ORDERED", "PENDING", "SAMPLE_COLLECTED", "IN_PROGRESS"] },
                    },
                }),
                prisma.labOrder.count({
                    where: {
                        laboratoryId: labProfile.id,
                        status: "COMPLETED",
                    },
                }),
                prisma.labOrder
                    .findMany({
                        where: { laboratoryId: labProfile.id },
                        distinct: ["patientId"],
                        select: { patientId: true },
                    })
                    .then((rows) => rows.length),
                prisma.labOrder.count({
                    where: {
                        laboratoryId: labProfile.id,
                        orderedAt: { gte: trailing30Days },
                    },
                }),
                prisma.userSubscription.findFirst({
                    where: {
                        userId: labUserId,
                        status: "active",
                        expiresAt: { gt: new Date() }
                    },
                    include: { plan: true }
                }),
                prisma.labOrder.findMany({
                    where: { laboratoryId: labProfile.id },
                    take: 10,
                    orderBy: { createdAt: "desc" },
                    include: {
                        patient: {
                            include: { user: { select: { firstName: true, lastName: true } } }
                        }
                    }
                })
            ]);

        // Volume Commission Tier Calculations (Spec Section 5)
        const isSubscribed = !!activeSub;
        let tierName = "Tier 1 (0–49 Orders)";
        let commissionPct = 15;
        let nextTierMin = 50;
        let ordersToNextTier = Math.max(0, 50 - trailing30Orders);
        let progressPct = Math.min(100, Math.round((trailing30Orders / 50) * 100));

        if (isSubscribed) {
            tierName = "Lab Partner Plan (Pro Subscribed)";
            commissionPct = activeSub.plan?.commissionRateOverride || 8;
            nextTierMin = null;
            ordersToNextTier = 0;
            progressPct = 100;
        } else if (trailing30Orders >= 200) {
            tierName = "Tier 3 (200+ Orders)";
            commissionPct = 10;
            nextTierMin = null;
            ordersToNextTier = 0;
            progressPct = 100;
        } else if (trailing30Orders >= 50) {
            tierName = "Tier 2 (50–199 Orders)";
            commissionPct = 12;
            nextTierMin = 200;
            ordersToNextTier = Math.max(0, 200 - trailing30Orders);
            progressPct = Math.min(100, Math.round(((trailing30Orders - 50) / 150) * 100));
        }

        // Financial Earnings Calculation
        let grossEarningsGHS = 0;
        let platformFeesGHS = 0;

        const formattedOrders = RecentOrders.map((ord) => {
            const amountGHS = ord.totalAmountGHS || ord.priceGHS || 150;
            const feeGHS = amountGHS * (commissionPct / 100);
            const netPayoutGHS = amountGHS - feeGHS;
            
            grossEarningsGHS += amountGHS;
            platformFeesGHS += feeGHS;

            return {
                id: ord.id,
                testName: ord.testName || ord.testType || "Standard Lab Panel",
                patientName: ord.patient?.user ? `${ord.patient.user.firstName} ${ord.patient.user.lastName}`.trim() : "Patient",
                status: ord.status,
                orderedAt: ord.orderedAt || ord.createdAt,
                amountGHS,
                commissionPct,
                platformFeeGHS: feeGHS,
                netPayoutGHS
            };
        });

        const netEarningsGHS = grossEarningsGHS - platformFeesGHS;

        const payload = {
            pendingTests: pendingOrders,
            reportsUploaded: completedOrders,
            totalPatients,
            earnings: `GHS ${netEarningsGHS.toFixed(2)}`,
            grossEarningsGHS,
            platformFeesGHS,
            netEarningsGHS,
            totalOrders,
            pendingOrders,
            completedOrders,
            trailing30Orders,
            volumeTier: {
                tierName,
                commissionPct,
                isSubscribed,
                nextTierMin,
                ordersToNextTier,
                progressPct
            },
            recentOrders: formattedOrders
        };

        return res.json({
            success: true,
            data: payload,
            ...payload
        });
    } catch (err) {
        console.error("❌ GET /laboratory/stats error:", err);
        return res.status(500).json({ error: "Failed to fetch stats" });
    }
});

/* ================================================================
   PROFILE
   GET  /api/laboratory/profile?userId=...
   PUT  /api/laboratory/profile
================================================================ */

/**
 * POST /api/laboratory/avatar (Upload/Replace Laboratory Avatar/Logo)
 */
router.post("/avatar", upload.single("avatar"), async (req, res) => {
    try {
        const userId = req.user?.id || req.body?.userId;
        if (!userId) return res.status(400).json({ error: "User identity missing" });

        if (!req.file) {
            return res.status(400).json({ error: "No image file provided" });
        }

        let publicUrl;
        const supabaseClient = supabaseAdmin;
        if (supabaseClient) {
            const ext = req.file.originalname.split(".").pop() || "png";
            const fileName = `laboratory-${userId}-${Date.now()}.${ext}`;
            const { error: uploadError } = await supabaseClient.storage
                .from("avatars")
                .upload(fileName, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: true,
                });

            if (!uploadError) {
                const { data } = supabaseClient.storage.from("avatars").getPublicUrl(fileName);
                publicUrl = data.publicUrl;
            } else {
                console.warn("Supabase laboratory avatar upload warning:", uploadError.message);
            }
        }
        if (!publicUrl) {
            publicUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
        }

        // Save in DB
        try {
            await prisma.$executeRawUnsafe(
                `UPDATE "User" SET "avatarUrl" = $1 WHERE id = $2`,
                publicUrl,
                String(userId)
            ).catch(() => {});
            await prisma.$executeRawUnsafe(
                `UPDATE "LaboratoryProfile" SET "avatarUrl" = $1 WHERE "userId" = $2`,
                publicUrl,
                String(userId)
            ).catch(() => {});
        } catch (dbErr) {
            console.warn("Could not update lab avatar in db:", dbErr.message);
        }

        return res.json({
            success: true,
            avatarUrl: publicUrl,
            message: "Laboratory photo uploaded and saved successfully",
        });
    } catch (err) {
        console.error("Laboratory avatar upload error:", err);
        return res.status(500).json({ error: "Internal server error during avatar upload" });
    }
});

router.get("/profile", ...authenticateLab, async (req, res) => {
    try {
        const userId = inferUserId(req);
        if (!userId) return res.status(400).json({ error: "userId is required" });

        const isUuid = (s) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
        if (!isUuid(userId))
            return res.status(400).json({ error: "Invalid userId format" });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, email: true, firstName: true, lastName: true },
        });
        if (!user) return res.status(404).json({ error: "User not found" });

        await ensureDefaultProfile(user, undefined, undefined);
        const rows = await prisma.$queryRawUnsafe(
            `SELECT * FROM "LaboratoryProfile" WHERE "userId" = $1 LIMIT 1`,
            userId
        );
        const rawProfile = rows && rows.length > 0 ? rows[0] : null;

        const isApproved = user?.approvalStatus === "APPROVED" || rawProfile?.verificationStatus === "VERIFIED" || rawProfile?.verificationStatus === "APPROVED";
        if (isApproved && rawProfile && rawProfile.verificationStatus !== "VERIFIED") {
            await prisma.$executeRawUnsafe(`UPDATE "LaboratoryProfile" SET "verificationStatus" = 'VERIFIED' WHERE "userId" = $1`, userId).catch(() => {});
        }

        const avatarRows = await prisma.$queryRawUnsafe(
            `SELECT "avatarUrl" FROM "User" WHERE id = $1 LIMIT 1`,
            userId
        ).catch(() => []);
        const userAvatarUrl = avatarRows && avatarRows.length > 0 ? avatarRows[0].avatarUrl : null;

        const finalAvatar = rawProfile?.avatarUrl || userAvatarUrl || null;

        const responseData = {
            ...rawProfile,
            avatarUrl: finalAvatar,
            referenceId: rawProfile?.referenceId || "CV-LB-GH-2026-0001",
            verificationStatus: isApproved ? "VERIFIED" : (rawProfile?.verificationStatus || "PENDING"),
            laboratoryName: rawProfile?.laboratoryName || rawProfile?.displayName || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
            registrationDate: rawProfile?.createdAt || new Date(),
            user: {
                ...user,
                avatarUrl: finalAvatar,
            }
        };

        return res.json({ success: true, data: responseData });
    } catch (err) {
        console.error("❌ GET /laboratory/profile error:", err);
        return res.status(500).json({ error: "Failed to load profile" });
    }
});

router.put("/profile", verifyToken, async (req, res) => {
    try {
        const userId = inferUserId(req);
        if (!userId) return res.status(400).json({ error: "userId is required" });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true },
        });
        if (!user) return res.status(404).json({ error: "User not found" });

        console.log(
            `[RBAC] Incoming Lab Profile Update - UserID: ${userId}, TokenID: ${req.user.id}, Role: ${req.user.role}`
        );

        if (
            req.user.role === "LABORATORY" &&
            String(req.user.id) !== String(userId)
        ) {
            console.warn(
                `[RBAC] 🛡️ Blocked lab profile update. Request ID: ${userId}, Token ID: ${req.user.id}`
            );
            return res.status(403).json({
                error: "Forbidden",
                message: "You are not authorized to update this profile.",
            });
        }

        const {
            displayName,
            licenseNumber,
            phone,
            firstName,
            lastName,
            address,
            city,
            state,
            country,
            postalCode,
            latitude,
            longitude,
            openingHours,
            services,       // comma-separated or JSON string of tests offered
            maritalStatus,
            timezone,
        } = req.body || {};

        const data = {
            displayName: toNullIfBlank(displayName),
            licenseNumber: toNullIfBlank(licenseNumber),
            phone: toNullIfBlank(phone),
            address: toNullIfBlank(address),
            city: toNullIfBlank(city),
            state: toNullIfBlank(state),
            country: toNullIfBlank(country),
            postalCode: toNullIfBlank(postalCode),
            latitude: toFloatOrNull(latitude),
            longitude: toFloatOrNull(longitude),
            openingHours: toNullIfBlank(openingHours),
            services: toNullIfBlank(services),
            timezone: timezone || undefined,
            updatedAt: new Date(),
        };

        // Sync User fields
        const userData = {};
        if (phone) userData.phone = String(phone).trim();
        if (firstName) userData.firstName = String(firstName).trim();
        if (lastName) userData.lastName = String(lastName).trim();
        if (maritalStatus) userData.maritalStatus = maritalStatus;

        if (Object.keys(userData).length > 0) {
            await prisma.user.update({ where: { id: userId }, data: userData });
        }

        const saved = await prisma.laboratoryProfile.upsert({
            where: { userId },
            update: data,
            create: { userId, ...data },
            include: { user: true },
        });

        return res.json({ success: true, message: "✅ Profile saved", data: saved });
    } catch (err) {
        console.error("❌ PUT /laboratory/profile error:", err);
        return res.status(500).json({ error: "Failed to save profile" });
    }
});

/* ================================================================
   LAB ORDERS
   GET    /api/laboratory/orders?userId=...
   POST   /api/laboratory/orders
   PATCH  /api/laboratory/orders/:id/status
   PUT    /api/laboratory/orders/:id
   DELETE /api/laboratory/orders/:id
================================================================ */

// List all orders for this lab
router.get(
    "/orders",
    verifyToken,
    requireRole(["LABORATORY", "ADMIN", "SUPERADMIN"]),
    async (req, res) => {
        try {
            const userId = inferUserId(req);
            if (!userId) return res.status(400).json({ error: "userId is required" });

            const lab = await getOrCreateLabProfile(userId);
            if (!lab) return res.json({ success: true, data: [] });

            const list = await prisma.labOrder.findMany({
                where: { laboratoryId: lab.id },
                include: {
                    doctor: { include: { user: true } },
                    patient: { include: { user: true } },
                },
                orderBy: { orderedAt: "desc" },
            });

            return res.json({ success: true, data: list });
        } catch (err) {
            console.error("❌ GET /laboratory/orders error:", err);
            return res.status(500).json({ error: "Failed to load orders" });
        }
    }
);


// Add this in backend/routes/laboratory.js

router.get(
    "/reports",
    verifyToken,
    requireRole(["LABORATORY", "ADMIN", "SUPERADMIN"]),
    async (req, res) => {
        try {
            const userId = inferUserId(req);
            if (!userId) return res.status(400).json({ error: "userId is required" });

            const lab = await getOrCreateLabProfile(userId);
            if (!lab) return res.json({ success: true, data: [] });

            // Yahan se aap reports fetch karein
            const reports = await prisma.labOrder.findMany({
                where: {
                    laboratoryId: lab.id,
                    resultUrl: { not: null }
                },
                include: {
                    doctor: { include: { user: true } },
                    patient: { include: { user: true } },
                },
                orderBy: { orderedAt: "desc" },
            });

            const formattedReports = reports.map(r => ({
                id: r.id,
                patientName: r.patient ? `${r.patient.user.firstName} ${r.patient.user.lastName}` : "N/A",
                testName: r.testName,
                doctorName: r.doctor ? `${r.doctor.user.firstName} ${r.doctor.user.lastName}` : "N/A",
                createdAt: r.orderedAt,
                status: r.status,
                reportUrl: r.resultUrl || "#",
                resultNotes: r.resultNotes || "",
            }));

            return res.json({ success: true, data: formattedReports });
        } catch (err) {
            console.error("❌ GET /laboratory/reports error:", err);
            return res.status(500).json({ error: "Failed to load reports" });
        }
    }
);

// Create a new lab order (lab creates manually, e.g. walk-in)
router.post(
    "/orders",
    verifyToken,
    requireRole(["LABORATORY", "ADMIN", "SUPERADMIN"]),
    async (req, res) => {
        try {
            const userId = inferUserId(req);
            if (!userId) return res.status(400).json({ error: "userId is required" });

            const lab = await getOrCreateLabProfile(userId);
            if (!lab)
                return res.status(404).json({ error: "Laboratory profile not found" });

            const { patientId, doctorId, testName, notes, priority, resultUrl } = req.body;

            if (!patientId || !testName) {
                return res
                    .status(400)
                    .json({ error: "patientId and testName are required" });
            }

            const created = await prisma.labOrder.create({
                data: {
                    laboratoryId: lab.id,
                    patientId,
                    doctorId: doctorId || null,
                    testName,
                    notes: notes || null,
                    priority: priority || "ROUTINE",
                    status: resultUrl ? "PENDING" : "ORDERED",
                    resultUrl: resultUrl || null,
                    completedAt: null,
                },
                include: {
                    doctor: { include: { user: true } },
                    patient: { include: { user: true } },
                },
            });

            // Notify patient & doctor by email if completed
            if (created.status === "COMPLETED" && created.patient?.user?.email) {
                emailService
                    .sendLabResultNotification?.(created, created.patient.user, created.doctor?.user)
                    .catch((e) => console.error("Lab result email error:", e));
            }

            return res
                .status(201)
                .json({ success: true, message: "✅ Order created", data: created });
        } catch (err) {
            console.error("❌ POST /laboratory/orders error:", err);
            return res.status(500).json({ error: "Failed to create order" });
        }
    }
);

// Update order status
// Status flow: ORDERED → SAMPLE_COLLECTED → IN_PROGRESS → COMPLETED | CANCELLED
router.patch(
    "/orders/:id/status",
    verifyToken,
    requireRole(["LABORATORY", "ADMIN", "SUPERADMIN"]),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body || {};

            const allowed = [
                "ORDERED",
                "SAMPLE_COLLECTED",
                "IN_PROGRESS",
                "COMPLETED",
                "CANCELLED",
            ];
            if (!allowed.includes(String(status))) {
                return res.status(400).json({ error: "Invalid status value" });
            }

            const updated = await prisma.labOrder.update({
                where: { id: String(id) },
                data: {
                    status,
                    ...(status === "COMPLETED" && { completedAt: new Date() }),
                },
                include: {
                    doctor: { include: { user: true } },
                    patient: { include: { user: true } },
                },
            });

            return res.json({
                success: true,
                message: "✅ Status updated",
                data: updated,
            });
        } catch (err) {
            console.error("❌ PATCH /laboratory/orders/:id/status error:", err);
            return res.status(500).json({ error: "Failed to update order status" });
        }
    }
);

// Upload result URL for existing order
router.patch(
    "/orders/:id/result",
    verifyToken,
    requireRole(["LABORATORY", "ADMIN", "SUPERADMIN"]),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { resultUrl, resultNotes } = req.body || {};

            if (!resultUrl) {
                return res.status(400).json({ error: "resultUrl is required" });
            }

            const updated = await prisma.labOrder.update({
                where: { id: String(id) },
                data: {
                    resultUrl,
                    resultNotes: resultNotes || null,
                    status: "PENDING",
                    completedAt: null,
                },
                include: {
                    doctor: { include: { user: true } },
                    patient: { include: { user: true } },
                },
            });

            return res.json({
                success: true,
                message: "✅ Report uploaded successfully",
                data: updated,
            });
        } catch (err) {
            console.error("❌ PATCH /laboratory/orders/:id/result error:", err);
            return res.status(500).json({ error: "Failed to attach report result" });
        }
    }
);

// Edit order details
router.put(
    "/orders/:id",
    verifyToken,
    requireRole(["LABORATORY", "ADMIN", "SUPERADMIN"]),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { testName, notes, priority, resultUrl, resultNotes } = req.body || {};

            const updated = await prisma.labOrder.update({
                where: { id: String(id) },
                data: {
                    ...(testName && { testName }),
                    ...(notes !== undefined && { notes }),
                    ...(priority && { priority }),
                    ...(resultUrl !== undefined && { resultUrl }),
                    ...(resultNotes !== undefined && { resultNotes }),
                },
                include: {
                    doctor: { include: { user: true } },
                    patient: { include: { user: true } },
                },
            });

            return res.json({
                success: true,
                message: "✅ Order updated",
                data: updated,
            });
        } catch (err) {
            console.error("❌ PUT /laboratory/orders/:id error:", err);
            return res.status(500).json({ error: "Failed to update order" });
        }
    }
);

// Delete order
router.delete(
    "/orders/:id",
    verifyToken,
    requireRole(["LABORATORY", "ADMIN", "SUPERADMIN"]),
    async (req, res) => {
        try {
            const { id } = req.params;
            const existing = await prisma.labOrder.findUnique({ where: { id: String(id) } });
            if (!existing) {
                return res.json({ success: true, message: "Order already removed" });
            }
            await prisma.labOrder.delete({ where: { id: String(id) } });
            return res.json({ success: true, message: "✅ Order deleted" });
        } catch (err) {
            if (err.code === "P2025") {
                return res.json({ success: true, message: "Order already removed" });
            }
            console.error("❌ DELETE /laboratory/orders/:id error:", err);
            return res.status(500).json({ error: "Failed to delete order" });
        }
    }
);

/* ================================================================
   UPLOAD / ATTACH RESULT
   POST /api/laboratory/upload-report
   Body: multipart/form-data { patientId, doctorId, testName, remarks, orderId (optional), report }
================================================================ */
router.post(
    "/upload-report",
    verifyToken,
    requireRole(["LABORATORY", "ADMIN", "SUPERADMIN"]),
    upload.single("report"),
    async (req, res) => {
        try {
            const userId = inferUserId(req);
            if (!userId) return res.status(400).json({ error: "userId is required" });

            const lab = await getOrCreateLabProfile(userId);
            if (!lab) return res.status(404).json({ error: "Laboratory profile not found" });

            const { patientId, doctorId, testName, remarks, orderId } = req.body;
            const reportFile = req.file;

            if (!patientId || !doctorId || !testName || !reportFile) {
                return res.status(400).json({ error: "Missing required fields (patientId, doctorId, testName, report)" });
            }

            // Upload to Supabase
            if (!supabaseAdmin) {
                return res.status(503).json({ error: "Storage service unavailable" });
            }

            const ext = reportFile.originalname.split(".").pop().toLowerCase();
            const storagePath = `lab-reports/${lab.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;

            const { error: uploadError } = await supabaseAdmin.storage
                .from("license-documents") // Using existing bucket or we should use a separate one, let's use license-documents for now or lab-reports if it exists
                .upload(storagePath, reportFile.buffer, {
                    contentType: reportFile.mimetype,
                    upsert: true,
                });

            if (uploadError) {
                // fallback or handle error
                console.error("Storage upload error:", uploadError);
                return res.status(500).json({ error: "Failed to upload file to storage" });
            }

            // Get signed URL or public URL (using signed for 30 days as a placeholder)
            const { data: signedUrlData } = await supabaseAdmin.storage
                .from("license-documents")
                .createSignedUrl(storagePath, 30 * 24 * 60 * 60);

            const resultUrl = signedUrlData?.signedUrl ?? "";

            let createdOrUpdatedOrder;

            if (orderId) {
                // Update existing order (e.g. assigned by doctor)
                createdOrUpdatedOrder = await prisma.labOrder.update({
                    where: { id: orderId },
                    data: {
                        resultUrl,
                        resultNotes: remarks || null,
                        status: "PENDING",
                        completedAt: null,
                    },
                });
            } else {
                // Create new walk-in order
                createdOrUpdatedOrder = await prisma.labOrder.create({
                    data: {
                        laboratoryId: lab.id,
                        patientId,
                        doctorId,
                        testName,
                        notes: remarks || null,
                        status: "PENDING",
                        completedAt: null,
                        resultUrl,
                    },
                });
            }

            return res.json({
                success: true,
                message: "✅ Report uploaded successfully",
                data: createdOrUpdatedOrder,
            });
        } catch (err) {
            console.error("❌ POST /laboratory/upload-report error:", err);
            return res.status(500).json({ error: "Failed to upload report" });
        }
    }
);

/* ================================================================
   RE-UPLOAD REPORT (For rejected reports)
   PUT /api/laboratory/orders/:id/re-upload
================================================================ */
router.put(
    "/orders/:id/re-upload",
    verifyToken,
    requireRole(["LABORATORY", "ADMIN", "SUPERADMIN"]),
    upload.single("report"),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { testName, remarks } = req.body;
            const reportFile = req.file;

            let resultUrl = undefined;

            if (reportFile) {
                if (!supabaseAdmin) {
                    return res.status(503).json({ error: "Storage service unavailable" });
                }
                const ext = reportFile.originalname.split(".").pop().toLowerCase();
                const storagePath = `lab-reports/re-uploads/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
                const { error: uploadError } = await supabaseAdmin.storage
                    .from("license-documents")
                    .upload(storagePath, reportFile.buffer, { contentType: reportFile.mimetype, upsert: true });

                if (!uploadError) {
                    const { data: signedUrlData } = await supabaseAdmin.storage
                        .from("license-documents")
                        .createSignedUrl(storagePath, 30 * 24 * 60 * 60);
                    resultUrl = signedUrlData?.signedUrl;
                }
            }

            const updated = await prisma.labOrder.update({
                where: { id: String(id) },
                data: {
                    ...(testName && { testName }),
                    ...(remarks !== undefined && { notes: remarks }),
                    ...(resultUrl && { resultUrl }),
                    status: "PENDING", // back to doctor for review
                    resultNotes: null // clear rejection notes
                },
            });

            return res.json({ success: true, message: "✅ Report re-uploaded", data: updated });
        } catch (err) {
            console.error("❌ PUT /laboratory/orders/:id/re-upload error:", err);
            return res.status(500).json({ error: "Failed to re-upload report" });
        }
    }
);

/* ================================================================
   HELPERS FOR MODALS
   GET /api/laboratory/doctors-list
   GET /api/laboratory/patients-list
================================================================ */
router.get("/doctors-list", async (_req, res) => {
    try {
        const list = await prisma.doctorProfile.findMany({
            where: { user: { role: "DOCTOR" } },
            include: {
                user: { select: { firstName: true, lastName: true, email: true } },
            },
            take: 100,
        });
        const data = list.map((d) => ({
            id: d.id,
            name: d.user
                ? `${d.user.firstName} ${d.user.lastName}`.trim()
                : "Unknown Doctor",
            email: d.user?.email,
        }));
        return res.json({ success: true, data });
    } catch (e) {
        console.error("❌ GET /laboratory/doctors-list error:", e);
        return res.status(500).json({ error: "Failed to load doctors" });
    }
});

router.get("/patients-list", async (_req, res) => {
    try {
        const list = await prisma.patientProfile.findMany({
            where: { user: { role: "PATIENT" } },
            include: {
                user: { select: { firstName: true, lastName: true, email: true } },
            },
            take: 100,
        });
        const data = list.map((p) => ({
            id: p.id,
            name: p.user
                ? `${p.user.firstName} ${p.user.lastName}`.trim()
                : "Unknown Patient",
            email: p.user?.email,
        }));
        return res.json({ success: true, data });
    } catch (e) {
        console.error("❌ GET /laboratory/patients-list error:", e);
        return res.status(500).json({ error: "Failed to load patients" });
    }
});

/* ================================================================
   PUBLIC LIST
   GET /api/laboratory/list
   Used by patient or doctor to browse laboratories
================================================================ */
router.get("/list", async (_req, res) => {
    try {
        const labs = await prisma.laboratoryProfile.findMany({
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        const items = labs.map((l) => ({
            id: l.id,
            name:
                l.displayName ||
                (l.user ? `${l.user.firstName} ${l.user.lastName}`.trim() : "Unnamed Lab"),
            email: l.user?.email,
            phone: l.phone,
            address: l.address,
            city: l.city,
            state: l.state,
            country: l.country,
            latitude: l.latitude,
            longitude: l.longitude,
            openingHours: l.openingHours,
            services: l.services,
            licenseNumber: l.licenseNumber,
            labProfile: l,
        }));

        return res.json({ success: true, data: { items } });
    } catch (err) {
        console.error("❌ GET /laboratory/list error:", err);
        return res.status(500).json({ error: "Failed to load laboratory list" });
    }
});

/* ================================================================
   PATIENT SELECTED LAB (mirror of pharmacy patient-select flow)
   GET    /api/laboratory/patient/selected?patientId=...
   POST   /api/laboratory/patient/select
   DELETE /api/laboratory/patient/select/:mapId
   PATCH  /api/laboratory/patient/select/:mapId/preferred
================================================================ */
router.get("/patient/selected", async (req, res) => {
    try {
        const { patientId } = req.query;
        if (!patientId)
            return res.status(400).json({ error: "patientId is required" });

        const pat = await prisma.patientProfile.findUnique({
            where: { userId: String(patientId) },
            select: { id: true },
        });
        if (!pat) return res.json({ success: true, data: [] });

        const selected = await prisma.selectedLaboratory.findMany({
            where: { patientId: pat.id },
            include: {
                LaboratoryProfile: {
                    include: {
                        user: { select: { firstName: true, lastName: true, email: true } },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        const items = selected.map((s) => ({
            mapId: s.id,
            laboratoryId: s.laboratoryId,
            preferred: s.preferred,
            name:
                s.LaboratoryProfile.displayName ||
                (s.LaboratoryProfile.user
                    ? `${s.LaboratoryProfile.user.firstName} ${s.LaboratoryProfile.user.lastName}`.trim()
                    : "Laboratory"),
            address: s.LaboratoryProfile.address,
            email: s.LaboratoryProfile.user?.email,
            labProfile: s.LaboratoryProfile,
        }));

        return res.json({ success: true, data: items });
    } catch (err) {
        console.error("❌ GET /laboratory/patient/selected error:", err);
        return res.status(500).json({ error: "Failed to load selected list" });
    }
});

router.post("/patient/select", verifyToken, async (req, res) => {
    try {
        const { patientId, laboratoryId } = req.body;
        if (!patientId || !laboratoryId)
            return res.status(400).json({ error: "Missing ids" });

        const pat = await prisma.patientProfile.findUnique({
            where: { userId: String(patientId) },
        });
        if (!pat)
            return res.status(404).json({ error: "Patient profile not found" });

        const existing = await prisma.selectedLaboratory.findUnique({
            where: {
                patientId_laboratoryId: {
                    patientId: pat.id,
                    laboratoryId: String(laboratoryId),
                },
            },
        });

        if (existing)
            return res.status(400).json({ error: "Already added to your list" });

        await prisma.selectedLaboratory.create({
            data: { patientId: pat.id, laboratoryId: String(laboratoryId) },
        });

        return res.json({ success: true, message: "Added to list" });
    } catch (err) {
        console.error("❌ POST /laboratory/patient/select error:", err);
        return res.status(500).json({ error: "Failed to add laboratory" });
    }
});

router.delete("/patient/select/:mapId", verifyToken, async (req, res) => {
    try {
        const { mapId } = req.params;
        await prisma.selectedLaboratory.delete({ where: { id: mapId } });
        return res.json({ success: true, message: "Removed" });
    } catch (err) {
        console.error("❌ DELETE /laboratory/patient/select/:mapId error:", err);
        return res.status(500).json({ error: "Failed to remove" });
    }
});

router.patch(
    "/patient/select/:mapId/preferred",
    verifyToken,
    async (req, res) => {
        try {
            const { mapId } = req.params;
            const { preferred } = req.body;

            if (preferred) {
                const current = await prisma.selectedLaboratory.findUnique({
                    where: { id: mapId },
                });
                if (current) {
                    await prisma.selectedLaboratory.updateMany({
                        where: { patientId: current.patientId },
                        data: { preferred: false },
                    });
                }
            }

            const updated = await prisma.selectedLaboratory.update({
                where: { id: mapId },
                data: { preferred: Boolean(preferred) },
            });
            return res.json({ success: true, data: updated });
        } catch (err) {
            console.error("❌ PATCH preferred error:", err);
            return res.status(500).json({ error: "Failed to update preference" });
        }
    }
);

module.exports = router;