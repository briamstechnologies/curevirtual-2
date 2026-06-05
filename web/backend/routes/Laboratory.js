// FILE: backend/routes/laboratory.js
const express = require("express");
const router = express.Router();
const prisma = require("../prisma/prismaClient");
const { verifyToken, requireRole } = require("../middleware/rbac.js");
const emailService = require("../services/emailService");

const authenticateLab = [verifyToken, requireRole(["LABORATORY", "SUPERADMIN", "ADMIN"])];
 
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

/* ================================================================
   DASHBOARD STATS
   GET /api/laboratory/stats
================================================================ */
router.get("/stats", ...authenticateLab, async (req, res) => {
    try {
        const labUserId = req.user?.id;

        const labProfile = await prisma.laboratoryProfile.findUnique({
            where: { userId: labUserId },
            select: { id: true },
        });

        if (!labProfile) {
            return res.json({
                totalOrders: 0,
                pendingOrders: 0,
                completedOrders: 0,
                totalPatients: 0,
            });
        }

        const [totalOrders, pendingOrders, completedOrders, totalPatients] =
            await Promise.all([
                prisma.labOrder.count({
                    where: { laboratoryId: labProfile.id },
                }),
                prisma.labOrder.count({
                    where: {
                        laboratoryId: labProfile.id,
                        status: { in: ["ORDERED", "SAMPLE_COLLECTED", "IN_PROGRESS"] },
                    },
                }),
                prisma.labOrder.count({
                    where: { laboratoryId: labProfile.id, status: "COMPLETED" },
                }),
                // Distinct patients this lab has orders for
                prisma.labOrder
                    .findMany({
                        where: { laboratoryId: labProfile.id },
                        distinct: ["patientId"],
                        select: { patientId: true },
                    })
                    .then((rows) => rows.length),
            ]);

        return res.json({
            totalOrders,
            pendingOrders,
            completedOrders,
            totalPatients,
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

        let profile = await prisma.laboratoryProfile.findUnique({
            where: { userId },
            include: { user: true },
        });

        if (!profile) {
            profile = await prisma.laboratoryProfile.create({
                data: { userId },
                include: { user: true },
            });
        }

        return res.json({ success: true, data: profile });
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

            const lab = await prisma.laboratoryProfile.findUnique({
                where: { userId },
                select: { id: true },
            });
            if (!lab) return res.json({ success: true, data: [] });

            const list = await prisma.labOrder.findMany({
                where: { laboratoryId: lab.id },
                include: {
                    doctor: { include: { user: true } },
                    patient: { include: { user: true } },
                },
                orderBy: { createdAt: "desc" },
            });

            return res.json({ success: true, data: list });
        } catch (err) {
            console.error("❌ GET /laboratory/orders error:", err);
            return res.status(500).json({ error: "Failed to load orders" });
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

            const lab = await prisma.laboratoryProfile.findUnique({
                where: { userId },
                select: { id: true },
            });
            if (!lab)
                return res.status(404).json({ error: "Laboratory profile not found" });

            const { patientId, doctorId, testName, notes, priority } = req.body;

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
                    status: "ORDERED",
                },
                include: {
                    doctor: { include: { user: true } },
                    patient: { include: { user: true } },
                },
            });

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
            await prisma.labOrder.delete({ where: { id: String(id) } });
            return res.json({ success: true, message: "✅ Order deleted" });
        } catch (err) {
            console.error("❌ DELETE /laboratory/orders/:id error:", err);
            return res.status(500).json({ error: "Failed to delete order" });
        }
    }
);

/* ================================================================
   UPLOAD / ATTACH RESULT
   PATCH /api/laboratory/orders/:id/result
   Body: { resultUrl, resultNotes }
   (Actual file upload is handled separately via your file-upload service)
================================================================ */
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
                    status: "COMPLETED",
                    completedAt: new Date(),
                },
                include: {
                    doctor: { include: { user: true } },
                    patient: { include: { user: true } },
                },
            });

            // Notify patient & doctor by email (optional)
            if (updated.patient?.user?.email) {
                emailService
                    .sendLabResultNotification?.(updated, updated.patient.user, updated.doctor?.user)
                    .catch((e) => console.error("Lab result email error:", e));
            }

            return res.json({
                success: true,
                message: "✅ Result uploaded",
                data: updated,
            });
        } catch (err) {
            console.error("❌ PATCH /laboratory/orders/:id/result error:", err);
            return res.status(500).json({ error: "Failed to upload result" });
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
                laboratory: {
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
                s.laboratory.displayName ||
                (s.laboratory.user
                    ? `${s.laboratory.user.firstName} ${s.laboratory.user.lastName}`.trim()
                    : "Laboratory"),
            address: s.laboratory.address,
            email: s.laboratory.user?.email,
            labProfile: s.laboratory,
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