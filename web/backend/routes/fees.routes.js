const express = require('express');
const router = express.Router();
const prisma = require('../prisma/prismaClient');

/**
 * GET /api/fees/config
 * Query params: ?type=payment_processing or ?feeType=payment_processing
 * Returns currently active platform_fee_config rates per Section 9 spec.
 */
router.get('/config', async (req, res) => {
    try {
        const feeType = req.query.type || req.query.feeType;

        const whereClause = { effectiveTo: null };
        if (feeType) {
            whereClause.feeType = feeType;
        }

        const feeConfigs = await prisma.platformFeeConfig.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json({
            success: true,
            fees: feeConfigs
        });
    } catch (error) {
        console.error("❌ Error fetching fee configs:", error);
        return res.status(500).json({
            success: false,
            message: "Server error fetching fee configs",
            error: error.message
        });
    }
});

module.exports = router;
