const cron = require('node-cron');
const prisma = require('./prisma/prismaClient');
const paReviewController = require('./controllers/paReview.controller');

// 1. Run every hour to check for overdue PA consult reviews
cron.schedule('0 * * * *', async () => {
    console.log('⏳ Running scheduled cron job: checkSLAOverdueReviews...');
    try {
        const req = {};
        const res = {
            status: () => res,
            json: (data) => console.log('✅ checkSLAOverdueReviews result:', data)
        };
        await paReviewController.checkSLAOverdueReviews(req, res);
    } catch (error) {
        console.error('❌ Error in checkSLAOverdueReviews cron:', error);
    }
});

/**
 * 2. Helper function to check and auto-expire outdated subscriptions
 */
async function autoExpireSubscriptions() {
    console.log('⏳ Running scheduled cron job: autoExpireSubscriptions...');
    try {
        const now = new Date();

        // A. Update UserSubscription model (New Schema enum: lowercase 'active')
        const userSubResult = await prisma.userSubscription.updateMany({
            where: {
                status: 'active',
                expiresAt: {
                    lt: now
                }
            },
            data: {
                status: 'expired'
            }
        });

        // B. Update legacy Subscription model (Legacy enum: uppercase 'ACTIVE')
        const legacySubResult = await prisma.subscription.updateMany({
            where: {
                status: 'ACTIVE',
                endDate: {
                    lt: now
                }
            },
            data: {
                status: 'EXPIRED'
            }
        });

        const totalExpired = (userSubResult.count || 0) + (legacySubResult.count || 0);
        console.log(`✅ autoExpireSubscriptions completed. Expired ${totalExpired} subscriptions (${userSubResult.count} new, ${legacySubResult.count} legacy).`);
        return totalExpired;
    } catch (error) {
        console.error('❌ Error in autoExpireSubscriptions cron:', error);
        return 0;
    }
}

/**
 * 3. Helper function for Subscription Renewal Reminders (48-72 hours before expiry)
 */
async function sendRenewalReminders() {
    console.log('⏳ Running scheduled cron job: sendRenewalReminders (48-72h expiry check)...');
    try {
        const now = new Date();
        const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        const in72Hours = new Date(now.getTime() + 72 * 60 * 60 * 1000);

        // Find UserSubscriptions expiring in 48-72h
        const expiringUserSubs = await prisma.userSubscription.findMany({
            where: {
                status: 'active',
                expiresAt: {
                    gte: in48Hours,
                    lte: in72Hours
                }
            },
            include: { plan: true }
        });

        let count = 0;
        for (const sub of expiringUserSubs) {
            // Avoid sending duplicate system notifications on the same day
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const existingNotif = await prisma.notification.findFirst({
                where: {
                    userId: sub.userId,
                    type: 'SYSTEM',
                    title: 'Subscription Expiry Reminder',
                    createdAt: { gte: startOfDay }
                }
            });

            if (!existingNotif) {
                const planName = sub.plan?.name || "Healthcare Plan";
                const expiryTimeStr = sub.expiresAt ? new Date(sub.expiresAt).toLocaleString() : "soon";

                await prisma.notification.create({
                    data: {
                        userId: sub.userId,
                        type: 'SYSTEM',
                        title: 'Subscription Expiry Reminder',
                        message: `Your ${planName} subscription expires in 2-3 days (${expiryTimeStr}). Please renew to maintain continuous access.`,
                        link: '/patient/subscription'
                    }
                });
                count++;
            }
        }

        console.log(`✅ sendRenewalReminders completed. Sent ${count} expiry reminder notifications.`);
        return count;
    } catch (error) {
        console.error('❌ Error in sendRenewalReminders cron:', error);
        return 0;
    }
}

// Schedule auto-expire to run every 15 minutes (so dev mode tests update fast)
cron.schedule('*/15 * * * *', autoExpireSubscriptions);

// Schedule renewal reminders to run daily at 01:00 AM
cron.schedule('0 1 * * *', sendRenewalReminders);

// Run an immediate check on startup so developer doesn't have to wait for cron interval
(async () => {
    try {
        await autoExpireSubscriptions();
        await sendRenewalReminders();
    } catch (e) {
        console.error('Initial cron boot execution error:', e);
    }
})();

console.log('✅ Cron jobs initialized.');

module.exports = {
    autoExpireSubscriptions,
    sendRenewalReminders
};
