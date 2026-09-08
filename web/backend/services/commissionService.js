// backend/services/commissionService.js
const prisma = require("../prisma/prismaClient");

/**
 * Helper to fetch a dynamic fee from PlatformFeeConfig with a safe fallback.
 * Strictly checks that effectiveTo is null (i.e. the currently active rate).
 */
async function getFeeConfig(feeType, fallbackPct) {
    try {
        const config = await prisma.platformFeeConfig.findFirst({
            where: { feeType, effectiveTo: null },
            orderBy: { createdAt: "desc" }
        });
        return config ? config.ratePct : fallbackPct;
    } catch (err) {
        // If feeType is not yet in the Prisma Enum (e.g. doctor_consultation), fallback gracefully
        return fallbackPct;
    }
}

/**
 * Helper to sum platform commissions in the current calendar year to see if VAT threshold is crossed.
 * Threshold is GHS 200,000.
 */
async function checkVatStackAndApply(platformCommission) {
    try {
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);

        const agg = await prisma.transaction.aggregate({
            _sum: {
                platformCommission: true
            },
            where: {
                status: "SUCCESS",
                createdAt: { gte: startOfYear }
            }
        });

        const annualCommission = agg._sum.platformCommission || 0.0;
        
        // If turnover is strictly over GHS 200,000, apply configurable vat_stack (default 20.0%)
        if (annualCommission > 200000.0) {
            const vatRate = await getFeeConfig("vat_stack", 20.0);
            const vatAmount = platformCommission * (vatRate / 100);
            return { vatAmount, vatRate };
        }
    } catch (error) {
        console.error("❌ Error calculating VAT Stack threshold check:", error);
    }
    return { vatAmount: 0.0, vatRate: 0.0 };
}

/**
 * 1. Calculate Consultation Split
 */
async function calculateConsultationSplit(amount, isPaConsult, paProfileId, doctorProfileId, doctorUserId) {
    // 1. Payment Processing Fee (Gateway cost)
    const processingPct = await getFeeConfig("payment_processing", 1.95);
    const paymentProcessingFee = amount * (processingPct / 100);

    // 2. Platform Commission (CureVirtual Margin)
    let platformPct = 12; // Base doctor rate
    if (isPaConsult) {
        platformPct = await getFeeConfig("pa_consultation", 10);
    } else if (doctorUserId) {
        // Check if doctor is subscribed for the discounted 8% rate using the true User ID
        const activeSub = await prisma.userSubscription.findFirst({
            where: { 
                userId: doctorUserId, 
                status: "active",
                expiresAt: { gt: new Date() }
            },
            include: { plan: true } 
        });
        
        if (activeSub) {
            // Respect the plan's custom override first, fallback to standard subscribed rate
            if (activeSub.plan && activeSub.plan.commissionRateOverride !== null) {
                platformPct = activeSub.plan.commissionRateOverride;
            } else {
                platformPct = await getFeeConfig("doctor_consultation_subscribed", 8);
            }
        } else {
            platformPct = await getFeeConfig("doctor_consultation", 12);
        }
    }

    const platformCommission = amount * (platformPct / 100);
    
    // The remainder after BOTH processing fees and platform margin are deducted
    const remainder = amount - paymentProcessingFee - platformCommission;

    let providerPayout = 0;
    let supervisingDoctorPayout = 0;

    // 3. PA vs Supervising Doctor Split
    // Uses the Profile IDs to query the PaRevenueSplit table
    if (isPaConsult && paProfileId && doctorProfileId) {
        let paShare = 70;
        let doctorShare = 30;
        const split = await prisma.paRevenueSplit.findFirst({
            where: { paId: paProfileId, doctorId: doctorProfileId, active: true },
            orderBy: { createdAt: "desc" }
        });
        
        if (split) {
            paShare = split.paSharePct;
            doctorShare = split.doctorSharePct;
        }
        
        providerPayout = remainder * (paShare / 100);
        supervisingDoctorPayout = remainder * (doctorShare / 100);
    } else {
        providerPayout = remainder;
    }

    const vatRes = await checkVatStackAndApply(platformCommission);
    const levyRate = await getFeeConfig("transfer_levy", 0.0);
    const providerTransferLevy = providerPayout * (levyRate / 100);
    const doctorTransferLevy = supervisingDoctorPayout * (levyRate / 100);

    return { 
        paymentProcessingFee,
        platformCommission, 
        providerPayout: providerPayout - providerTransferLevy, 
        supervisingDoctorPayout: supervisingDoctorPayout - doctorTransferLevy,
        vatAmount: vatRes.vatAmount,
        vatRate: vatRes.vatRate,
        providerTransferLevy,
        doctorTransferLevy
    };
}

/**
 * 2. Calculate Subscription Fee
 */
async function calculateSubscriptionFee(amount) {
    const processingPct = await getFeeConfig("payment_processing", 1.95);
    const paymentProcessingFee = amount * (processingPct / 100);
    
    // For subscriptions, the remainder is platform commission (minus gateway processing fee).
    const platformCommission = amount - paymentProcessingFee;

    const vatRes = await checkVatStackAndApply(platformCommission);

    return { 
        paymentProcessingFee, 
        platformCommission, 
        providerPayout: 0,
        vatAmount: vatRes.vatAmount,
        vatRate: vatRes.vatRate
    };
}

/**
 * 3. Calculate Order Commission (Pharmacy & Laboratory)
 * Dynamically looks up the volume tier for the trailing 30 days.
 */
async function calculateOrderCommission(amount, module, providerId) {
    // Exactly Trailing 30 days
    const trailing30Days = new Date();
    trailing30Days.setDate(trailing30Days.getDate() - 30);

    let orderCount = 0;
    try {
        if (module === 'laboratory') {
            orderCount = await prisma.labOrder.count({ 
                where: { 
                    laboratoryId: providerId, 
                    orderedAt: { gte: trailing30Days } 
                } 
            }); 
        } else if (module === 'pharmacy') {
            orderCount = await prisma.medicineOrder.count({ 
                where: { 
                    pharmacyId: providerId, 
                    createdAt: { gte: trailing30Days } 
                } 
            });
        }
    } catch (err) {
        console.error(`❌ Failed to fetch 30-day order count for ${module} ${providerId}:`, err);
    }

    const tiers = await prisma.volumeCommissionTier.findMany({
        where: { module: module, isActive: true },
        orderBy: { minMonthlyOrders: 'asc' }
    });

    let commissionPct = 15; // default fallback if tiers are missing
    let appliedTierName = "Default Tier";

    for (const tier of tiers) {
        if (orderCount >= tier.minMonthlyOrders && 
           (tier.maxMonthlyOrders === null || orderCount <= tier.maxMonthlyOrders)) {
            commissionPct = tier.commissionPct;
            appliedTierName = tier.tierName;
            break;
        }
    }

    const processingPct = await getFeeConfig("payment_processing", 1.95);
    const paymentProcessingFee = amount * (processingPct / 100);
    
    const platformCommission = amount * (commissionPct / 100);
    const providerPayout = amount - paymentProcessingFee - platformCommission;
    const vatRes = await checkVatStackAndApply(platformCommission);
    const levyRate = await getFeeConfig("transfer_levy", 0.0);
    const providerTransferLevy = providerPayout * (levyRate / 100);

    return { 
        paymentProcessingFee,
        platformCommission, 
        providerPayout: providerPayout - providerTransferLevy, 
        commissionPct, 
        appliedTierName,
        vatAmount: vatRes.vatAmount,
        vatRate: vatRes.vatRate,
        providerTransferLevy
    };
}

/**
 * 4. Process Transaction Payout
 */
async function processTransactionPayout(transactionId) {
    const tx = await prisma.transaction.findUnique({
        where: { id: transactionId }
    });
    
    if (!tx || !tx.amountGHS) return null;
    
    const amount = tx.amountGHS;
    let updateData = {};
    let calculatedTaxes = {};

    switch (tx.type) {
        case "CONSULTATION_PAYMENT":
        case "APPOINTMENT_PAYMENT": {
            const isPaConsult = !!(tx.paId && tx.supervisingDoctorId);
            
            let doctorProfileId = null;
            let doctorUserId = null;

            // EXPLICIT LOOKUPS EXACTLY AS REQUESTED
            if (isPaConsult && tx.supervisingDoctorId) {
                doctorProfileId = tx.supervisingDoctorId;
                const docProfile = await prisma.doctorProfile.findUnique({
                    where: { id: doctorProfileId },
                    select: { userId: true }
                });
                doctorUserId = docProfile?.userId;
            } else if (tx.appointmentId) {
                const appt = await prisma.appointment.findUnique({
                    where: { id: tx.appointmentId },
                    include: { doctor: true }
                });
                doctorProfileId = appt?.doctorId;
                doctorUserId = appt?.doctor?.userId;
            }

            const res = await calculateConsultationSplit(amount, isPaConsult, tx.paId, doctorProfileId, doctorUserId);
            
            updateData = {
                paymentProcessingFee: res.paymentProcessingFee,
                platformCommission: res.platformCommission,
                providerPayout: res.providerPayout,
                supervisingDoctorPayout: res.supervisingDoctorPayout,
            };
            calculatedTaxes = {
                vatAmount: res.vatAmount,
                vatRate: res.vatRate,
                providerTransferLevy: res.providerTransferLevy,
                doctorTransferLevy: res.doctorTransferLevy
            };
            break;
        }
        case "SUBSCRIPTION_PAYMENT": {
            const res = await calculateSubscriptionFee(amount);
            updateData = {
                paymentProcessingFee: res.paymentProcessingFee,
                platformCommission: res.platformCommission,
                providerPayout: res.providerPayout,
            };
            calculatedTaxes = {
                vatAmount: res.vatAmount,
                vatRate: res.vatRate
            };
            break;
        }
        case "ORDER_PAYMENT": {
            if (tx.orderId) {
                const order = await prisma.medicineOrder.findUnique({ where: { id: tx.orderId } });
                const pharmacyId = order?.pharmacyId;
                const res = await calculateOrderCommission(amount, "pharmacy", pharmacyId);
                updateData = {
                    paymentProcessingFee: res.paymentProcessingFee,
                    platformCommission: res.platformCommission,
                    providerPayout: res.providerPayout,
                    commissionTierApplied: res.appliedTierName
                };
                calculatedTaxes = {
                    vatAmount: res.vatAmount,
                    vatRate: res.vatRate,
                    providerTransferLevy: res.providerTransferLevy
                };
            }
            break;
        }
        case "LAB_ORDER_PAYMENT": {
            if (tx.labOrderId) {
                const labOrder = await prisma.labOrder.findUnique({ where: { id: tx.labOrderId } });
                const labId = labOrder?.laboratoryId;
                const res = await calculateOrderCommission(amount, "laboratory", labId);
                updateData = {
                    paymentProcessingFee: res.paymentProcessingFee,
                    platformCommission: res.platformCommission,
                    providerPayout: res.providerPayout,
                    commissionTierApplied: res.appliedTierName
                };
                calculatedTaxes = {
                    vatAmount: res.vatAmount,
                    vatRate: res.vatRate,
                    providerTransferLevy: res.providerTransferLevy
                };
            }
            break;
        }
    }

    if (Object.keys(updateData).length > 0) {
        // Merge taxes into metadata JSON
        let existingMetadata = {};
        try {
            existingMetadata = tx.metadata ? JSON.parse(tx.metadata) : {};
        } catch (e) {}

        Object.keys(calculatedTaxes).forEach(key => {
            if (calculatedTaxes[key] !== undefined && calculatedTaxes[key] !== null) {
                existingMetadata[key] = calculatedTaxes[key];
            }
        });

        updateData.metadata = JSON.stringify(existingMetadata);

        return prisma.transaction.update({
            where: { id: transactionId },
            data: updateData
        });
    }
    
    return tx;
}

module.exports = {
    calculateConsultationSplit,
    calculateSubscriptionFee,
    calculateOrderCommission,
    processTransactionPayout
};
