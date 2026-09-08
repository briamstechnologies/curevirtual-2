const prisma = require('../prisma/prismaClient');
const { checkPatientBenefits } = require('../utils/benefitsHelper');

/**
 * POST /api/transactions/consult
 * Books a consultation, creates a Transaction, and auto-spawns a PaConsultReview if it's a PA consult.
 * Note: Payment gateway integration (Stripe/Paystack) is intentionally omitted for this phase.
 */
exports.bookConsultation = async (req, res) => {
    try {
        const { appointmentId, amountGHS, isPaConsult, paProfileId, doctorProfileId } = req.body;
        const userId = req.user.id; // From verifyToken middleware

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized. User ID missing.' });
        }

        // Validate basic requirements
        if (!appointmentId || !amountGHS) {
            return res.status(400).json({ success: false, message: 'appointmentId and amountGHS are required.' });
        }

        // 1. Fetch actual Appointment to prevent spoofing
        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: { 
                encounter: true,
                doctor: true
            }
        });

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found.' });
        }

        // Fetch user to check benefits
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Calculate discount and enforce base consult fee from doctor profile
        const benefits = await checkPatientBenefits(userId, user.email);
        const discountPct = benefits.isSubscribed ? 20 : 0;

        const baseFee = appointment.doctor?.consultationFee;
        if (baseFee === undefined || baseFee === null || baseFee <= 0) {
            return res.status(400).json({ success: false, message: 'Doctor consultation fee not configured.' });
        }

        const expectedAmount = baseFee * (1 - discountPct / 100);

        // Cross-check: If client claims PA consult, verify the appointment actually has a PA assigned
        if (isPaConsult) {
            if (doctorProfileId && appointment.doctorId !== doctorProfileId) {
                return res.status(403).json({ success: false, message: 'Security check failed: doctorProfileId mismatch.' });
            }
            
            const activePaAssignment = await prisma.doctorPAAssignment.findFirst({
                where: { doctorId: appointment.doctorId, assignmentStatus: 'ACTIVE' }
            });
            
            if (!activePaAssignment) {
                return res.status(403).json({ success: false, message: 'Security check failed: No active PA assigned to this doctor.' });
            }
            
            if (activePaAssignment.paId !== paProfileId) {
                return res.status(403).json({ success: false, message: 'Security check failed: paProfileId mismatch with assigned PA.' });
            }
        }

        // 2. Create the Transaction record for the consult
        const transaction = await prisma.transaction.create({
            data: {
                userId,
                type: "CONSULTATION_PAYMENT",
                status: "PENDING",
                appointmentId,
                amount: expectedAmount,
                amountGHS: expectedAmount,
                currency: "GHS",
                provider: "PAYSTACK",
                paId: isPaConsult ? paProfileId : null,
                supervisingDoctorId: isPaConsult ? appointment.doctorId : null
            }
        });

        // 3. If it's a PA Consult, automatically create a PaConsultReview for doctor co-sign
        let reviewRecord = null;
        if (isPaConsult && paProfileId && appointment.doctorId) {
            reviewRecord = await prisma.paConsultReview.create({
                data: {
                    transactionId: transaction.id,
                    paId: paProfileId,
                    supervisingDoctorId: appointment.doctorId,
                    reviewStatus: "pending_review"
                }
            });
            console.log(`✅ Auto-spawned PaConsultReview for Transaction ${transaction.id}`);
        }

        // ⚠️ FUTURE PHASE NOTE (Phase 5: Payment Gateway)
        // When the Stripe/Paystack webhook confirms payment success, it will update this transaction's status to SUCCESS
        // and THEN call processTransactionPayout(transaction.id) from commissionService.js to distribute the funds.
        
        return res.status(201).json({
            success: true,
            message: 'Consultation booked successfully.',
            transaction,
            paReview: reviewRecord
        });

    } catch (error) {
        console.error('❌ Error booking consultation:', error);
        return res.status(500).json({ success: false, message: 'Server error booking consultation.', error: error.message });
    }
};

/**
 * GET /api/transactions/:id/receipt
 * Returns transaction receipt if user is authorized.
 */
exports.getTransactionReceipt = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized. User ID missing.' });
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id }
        });

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found.' });
        }

        // Authorization: Only owner or admin/superadmin can view
        const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';
        const isOwner = transaction.userId === userId;

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Forbidden. You do not have permission to view this receipt.' });
        }

        return res.status(200).json({
            success: true,
            receipt: {
                id: transaction.id,
                amount: transaction.amountGHS || transaction.amount,
                currency: transaction.currency || 'GHS',
                platformCommission: transaction.platformCommission,
                providerPayout: transaction.providerPayout,
                paymentStatus: transaction.status,
                paymentReference: transaction.providerTxId,
                timestamp: transaction.createdAt
            }
        });
    } catch (error) {
        console.error('❌ Error fetching transaction receipt:', error);
        return res.status(500).json({ success: false, message: 'Server error fetching receipt.', error: error.message });
    }
};
