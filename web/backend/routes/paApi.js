const express = require('express');
const router = express.Router();
const prisma = require('../prisma/prismaClient');
const { verifyToken } = require('../middleware/rbac');

// All endpoints in this file require verification
router.use(verifyToken);

/**
 * POST /api/pa/assign-doctor
 * Input: { paUserId, doctorUserId, paSharePct, doctorSharePct }
 * Creates/Updates split and links supervising doctor.
 */
router.post('/assign-doctor', async (req, res) => {
    try {
        const { paUserId, doctorUserId, paSharePct, doctorSharePct } = req.body || {};

        if (!paUserId || !doctorUserId) {
            return res.status(400).json({ success: false, message: 'paUserId and doctorUserId are required.' });
        }

        // Authorization: Admin or the supervising doctor themselves
        const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN';
        const isSelfDoctor = req.user.role === 'DOCTOR' && req.user.id === doctorUserId;

        if (!isAdmin && !isSelfDoctor) {
            return res.status(403).json({ success: false, message: 'Forbidden. Only administrators or the supervising doctor themselves can assign this PA.' });
        }

        // Resolve profiles
        const paProfile = await prisma.physicianAssistantProfile.findUnique({
            where: { userId: paUserId }
        });
        if (!paProfile) {
            return res.status(404).json({ success: false, message: 'Physician Assistant profile not found.' });
        }

        const doctorProfile = await prisma.doctorProfile.findUnique({
            where: { userId: doctorUserId }
        });
        if (!doctorProfile) {
            return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
        }

        // Validate splits if custom provided
        const paPct = paSharePct !== undefined ? parseFloat(paSharePct) : 70.0;
        const docPct = doctorSharePct !== undefined ? parseFloat(doctorSharePct) : 30.0;

        if (paPct + docPct !== 100) {
            return res.status(400).json({ success: false, message: 'Percentages paSharePct and doctorSharePct must sum to 100.' });
        }

        // Resolve active supervising doctor assignment
        const existingAssignment = await prisma.doctorPAAssignment.findFirst({
            where: {
                doctorId: doctorProfile.id,
                paId: paProfile.id,
                assignmentStatus: "ACTIVE"
            }
        });

        let assignment;
        if (existingAssignment) {
            assignment = existingAssignment;
        } else {
            assignment = await prisma.doctorPAAssignment.create({
                data: {
                    doctorId: doctorProfile.id,
                    paId: paProfile.id,
                    assignmentStatus: "ACTIVE",
                    createdBy: req.user.id || 'ADMIN'
                }
            });
        }

        // Upsert PaRevenueSplit (active = true)
        const existingSplit = await prisma.paRevenueSplit.findFirst({
            where: { paId: paProfile.id, doctorId: doctorProfile.id, active: true }
        });

        let split;
        if (existingSplit) {
            split = await prisma.paRevenueSplit.update({
                where: { id: existingSplit.id },
                data: {
                    paSharePct: paPct,
                    doctorSharePct: docPct
                }
            });
        } else {
            split = await prisma.paRevenueSplit.create({
                data: {
                    paId: paProfile.id,
                    doctorId: doctorProfile.id,
                    paSharePct: paPct,
                    doctorSharePct: docPct,
                    active: true
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: 'PA successfully assigned and revenue split configured.',
            assignment,
            split
        });

    } catch (error) {
        console.error('❌ Error assigning doctor to PA:', error);
        return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
    }
});

/**
 * GET /api/pa/:id/revenue-split
 * Returns active split and supervising doctor.
 */
router.get('/:id/revenue-split', async (req, res) => {
    try {
        const { id } = req.params;

        // Resolve PA profile by profile ID or user ID
        let paProfile = await prisma.physicianAssistantProfile.findUnique({
            where: { id }
        });
        if (!paProfile) {
            paProfile = await prisma.physicianAssistantProfile.findUnique({
                where: { userId: id }
            });
        }

        if (!paProfile) {
            return res.status(404).json({ success: false, message: 'Physician Assistant profile not found.' });
        }

        // Get active supervising doctor assignment
        const assignment = await prisma.doctorPAAssignment.findFirst({
            where: { paId: paProfile.id, assignmentStatus: "ACTIVE" },
            include: { doctor: { include: { user: true } } }
        });

        // Authorization: Admin, supervising doctor, or the PA themselves
        const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN';
        const isSelfPa = req.user.id === paProfile.userId;
        const isSupervisingDoctor = assignment && assignment.doctor.userId === req.user.id;

        if (!isAdmin && !isSelfPa && !isSupervisingDoctor) {
            return res.status(403).json({ success: false, message: 'Forbidden. You do not have permission to view this revenue split.' });
        }

        // Get split percentages (default to 70/30 if none found in database)
        let split = { paSharePct: 70.0, doctorSharePct: 30.0 };
        if (assignment) {
            const splitInDb = await prisma.paRevenueSplit.findFirst({
                where: { paId: paProfile.id, doctorId: assignment.doctorId, active: true },
                orderBy: { createdAt: 'desc' }
            });
            if (splitInDb) {
                split = splitInDb;
            }
        }

        return res.status(200).json({
            success: true,
            paSharePct: split.paSharePct,
            doctorSharePct: split.doctorSharePct,
            doctorId: assignment?.doctorId || null,
            doctorName: assignment ? `${assignment.doctor.user.firstName} ${assignment.doctor.user.lastName}` : null
        });

    } catch (error) {
        console.error('❌ Error getting PA split:', error);
        return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
    }
});

/**
 * PUT /api/pa/:id/revenue-split
 * Updates active split percentages. Only supervising doctor or admin can call.
 */
router.put('/:id/revenue-split', async (req, res) => {
    try {
        const { id } = req.params;
        const { paSharePct, doctorSharePct } = req.body || {};

        if (paSharePct === undefined || doctorSharePct === undefined) {
            return res.status(400).json({ success: false, message: 'paSharePct and doctorSharePct are required.' });
        }

        const paPct = parseFloat(paSharePct);
        const docPct = parseFloat(doctorSharePct);

        if (paPct + docPct !== 100) {
            return res.status(400).json({ success: false, message: 'Percentages paSharePct and doctorSharePct must sum to 100.' });
        }

        // Resolve PA profile
        let paProfile = await prisma.physicianAssistantProfile.findUnique({
            where: { id }
        });
        if (!paProfile) {
            paProfile = await prisma.physicianAssistantProfile.findUnique({
                where: { userId: id }
            });
        }

        if (!paProfile) {
            return res.status(404).json({ success: false, message: 'Physician Assistant profile not found.' });
        }

        // Find active supervising doctor
        const assignment = await prisma.doctorPAAssignment.findFirst({
            where: { paId: paProfile.id, assignmentStatus: "ACTIVE" },
            include: { doctor: true }
        });

        // Authorization: Admin or supervising doctor only (PA gets 403)
        const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN';
        const isSupervisingDoctor = assignment && assignment.doctor.userId === req.user.id;

        if (!isAdmin && !isSupervisingDoctor) {
            return res.status(403).json({ success: false, message: 'Forbidden. Only the supervising doctor or an administrator can adjust split percentages.' });
        }

        if (!assignment) {
            return res.status(400).json({ success: false, message: 'No active supervising doctor assignment found for this PA. Please assign a supervising doctor first.' });
        }

        // Upsert PaRevenueSplit
        const existingSplit = await prisma.paRevenueSplit.findFirst({
            where: { paId: paProfile.id, doctorId: assignment.doctorId, active: true }
        });

        let split;
        if (existingSplit) {
            split = await prisma.paRevenueSplit.update({
                where: { id: existingSplit.id },
                data: {
                    paSharePct: paPct,
                    doctorSharePct: docPct
                }
            });
        } else {
            split = await prisma.paRevenueSplit.create({
                data: {
                    paId: paProfile.id,
                    doctorId: assignment.doctorId,
                    paSharePct: paPct,
                    doctorSharePct: docPct,
                    active: true
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: 'PA revenue split updated successfully.',
            split
        });

    } catch (error) {
        console.error('❌ Error updating PA split:', error);
        return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
    }
});

module.exports = router;
