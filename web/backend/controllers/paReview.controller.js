const prisma = require('../prisma/prismaClient');

/**
 * GET /api/pa-reviews
 * Fetches PaConsultReview records dynamically based on the logged-in user's role.
 * If the user is a PA, it fetches reviews assigned to their paId.
 * If the user is a Doctor, it fetches reviews assigned to their supervisingDoctorId.
 */
exports.getConsultReviews = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role; // Typically 'PHYSICIAN_ASSISTANT' or 'DOCTOR'

        let reviews = [];

        if (userRole === 'PHYSICIAN_ASSISTANT') {
            // Find PA profile
            const pa = await prisma.physicianAssistantProfile.findUnique({ where: { userId } });
            if (pa) {
                reviews = await prisma.paConsultReview.findMany({
                    where: { paId: pa.id },
                    include: {
                        transaction: { include: { appointment: { include: { patient: { include: { user: true } } } } } }
                    },
                    orderBy: { createdAt: 'desc' }
                });
            }
        } else if (userRole === 'DOCTOR') {
            // Find Doctor profile
            const doctor = await prisma.doctorProfile.findUnique({ where: { userId } });
            if (doctor) {
                reviews = await prisma.paConsultReview.findMany({
                    where: { supervisingDoctorId: doctor.id },
                    include: {
                        transaction: { include: { appointment: { include: { patient: { include: { user: true } } } } } }
                    },
                    orderBy: { createdAt: 'desc' }
                });
            }
        } else {
            // Fallback for admins or unauthorized roles
            return res.status(403).json({ success: false, message: 'Only PAs and Doctors can access reviews.' });
        }

        return res.status(200).json({ success: true, reviews });

    } catch (error) {
        console.error('❌ Error fetching consult reviews:', error);
        return res.status(500).json({ success: false, message: 'Server error fetching consult reviews.', error: error.message });
    }
};

/**
 * PUT /api/pa-reviews/:id
 * Allows a supervising doctor to update the review status and add comments.
 */
exports.updateConsultReview = async (req, res) => {
    try {
        const reviewId = req.params.id;
        const { reviewStatus, doctorComments, consultNotes } = req.body;
        const userId = req.user.id;

        // Verify the doctor attempting the update is the assigned supervising doctor
        const doctor = await prisma.doctorProfile.findUnique({ where: { userId } });
        if (!doctor) {
            return res.status(403).json({ success: false, message: 'Unauthorized. Not a registered doctor.' });
        }

        const existingReview = await prisma.paConsultReview.findUnique({ where: { id: reviewId } });
        
        if (!existingReview) {
            return res.status(404).json({ success: false, message: 'Consult review not found.' });
        }

        if (existingReview.supervisingDoctorId !== doctor.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized. You are not the supervising doctor for this consult.' });
        }

        // Prepare the update payload
        const updateData = {};
        if (reviewStatus) {
            updateData.reviewStatus = reviewStatus;
            if (reviewStatus === 'co_signed') {
                updateData.reviewedAt = new Date();
            }
        }
        if (doctorComments !== undefined) updateData.doctorComments = doctorComments;
        if (consultNotes !== undefined) updateData.consultNotes = consultNotes;

        const updatedReview = await prisma.paConsultReview.update({
            where: { id: reviewId },
            data: updateData
        });

        return res.status(200).json({
            success: true,
            message: 'Consult review updated successfully.',
            review: updatedReview
        });

    } catch (error) {
        console.error('❌ Error updating consult review:', error);
        return res.status(500).json({ success: false, message: 'Server error updating consult review.', error: error.message });
    }
};

/**
 * GET /api/pa-reviews/overdue-sla
 * Section 7: Uncosigned consults past SLA (24 hrs) trigger internal compliance alerts.
 */
exports.checkSLAOverdueReviews = async (req, res) => {
    try {
        const slaThresholdHours = 24;
        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - slaThresholdHours);

        // Find all PA reviews still in pending_review created over 24 hours ago
        const overdueReviews = await prisma.paConsultReview.findMany({
            where: {
                reviewStatus: 'pending_review',
                createdAt: { lt: cutoffDate }
            },
            include: {
                transaction: true
            }
        });

        // Find all platform admin users
        const admins = await prisma.user.findMany({
            where: { role: { in: ['SUPERADMIN', 'ADMIN'] } },
            select: { id: true }
        });

        // Trigger Notification for each overdue review
        const alerts = [];
        for (const review of overdueReviews) {
            // Find doctor user ID
            const docProfile = await prisma.doctorProfile.findUnique({
                where: { id: review.supervisingDoctorId },
                select: { userId: true }
            });

            let alertSentForThisReview = false;

            // 1. Notify Supervising Doctor
            if (docProfile) {
                // Check if notification already sent
                const existingNotif = await prisma.notification.findFirst({
                    where: {
                        userId: docProfile.userId,
                        type: 'SYSTEM',
                        actionData: JSON.stringify({ paReviewId: review.id, alertType: 'SLA_OVERDUE' })
                    }
                });

                if (!existingNotif) {
                    await prisma.notification.create({
                        data: {
                            userId: docProfile.userId,
                            type: 'SYSTEM',
                            title: 'Compliance Alert: Uncosigned PA Consult Overdue',
                            message: `PA Consult Review (${review.id}) is pending co-signing past the 24-hour SLA window. Please review immediately.`,
                            actionData: JSON.stringify({ paReviewId: review.id, alertType: 'SLA_OVERDUE' })
                        }
                    });
                    alertSentForThisReview = true;
                }
            }

            // 2. Notify Platform Admins (SUPERADMIN and ADMIN)
            for (const admin of admins) {
                const existingAdminNotif = await prisma.notification.findFirst({
                    where: {
                        userId: admin.id,
                        type: 'SYSTEM',
                        actionData: JSON.stringify({ paReviewId: review.id, alertType: 'SLA_OVERDUE' })
                    }
                });

                if (!existingAdminNotif) {
                    await prisma.notification.create({
                        data: {
                            userId: admin.id,
                            type: 'SYSTEM',
                            title: 'Compliance Alert: Uncosigned PA Consult Overdue (Admin Alert)',
                            message: `PA Consult Review (${review.id}) is pending co-signing past the 24-hour SLA window by the Supervising Doctor.`,
                            actionData: JSON.stringify({ paReviewId: review.id, alertType: 'SLA_OVERDUE' })
                        }
                    });
                    alertSentForThisReview = true;
                }
            }

            if (alertSentForThisReview) {
                alerts.push(review.id);
            }
        }

        return res.status(200).json({
            success: true,
            overdueCount: overdueReviews.length,
            alertsTriggered: alerts.length,
            overdueReviews
        });
    } catch (error) {
        console.error('❌ Error checking SLA overdue reviews:', error);
        return res.status(500).json({ success: false, message: 'Server error checking SLA overdue reviews.', error: error.message });
    }
};
