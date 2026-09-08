const prisma = require("../prisma/prismaClient");
const { checkPatientBenefits } = require("../utils/benefitsHelper");

const subscriptionController = {
  // 1. Get all active subscription plans (Public or Authenticated)
  getPlans: async (req, res) => {
    try {
      const { module } = req.query; // filter e.g., ?module=patient
      const whereClause = { isActive: true };
      
      // Fix: SubscriptionModule enum in database is lowercase (patient, doctor, laboratory, pharmacy)
      if (module) whereClause.module = module.toLowerCase();

      // Fetch global FX rate from DB or config cache, fallback to 15.5 GHS/USD
      const GLOBAL_FX_RATE = parseFloat(process.env.GHS_USD_FX_RATE) || 15.5;

      let plans = await prisma.subscriptionPlan.findMany({
        where: whereClause,
        orderBy: { priceGHS: 'asc' }
      });
      
      // Spec Section 10: convert to USD at request time using FX rate cache
      plans = plans.map(p => ({
        ...p,
        priceUSD: Math.round((p.priceGHS / GLOBAL_FX_RATE) * 100) / 100
      }));

      return res.status(200).json({ success: true, plans });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 2. Admin: Create a new subscription plan
  createPlan: async (req, res) => {
    try {
      const { module, name, billingCycle, priceGHS, priceUSD, commissionRateOverride, perks } = req.body;
      const newPlan = await prisma.subscriptionPlan.create({
        data: { 
            module: module.toLowerCase(), 
            name, 
            billingCycle, 
            priceGHS, 
            priceUSD, 
            commissionRateOverride, 
            perks, 
            isActive: true 
        }
      });
      return res.status(201).json({ success: true, plan: newPlan });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 3. User: Get their own subscriptions
  getMySubscriptions: async (req, res) => {
    try {
      const userId = req.user.id;
      const subscriptions = await prisma.userSubscription.findMany({
        where: { userId },
        include: { plan: true },
        orderBy: { createdAt: 'desc' }
      });
      return res.status(200).json({ success: true, subscriptions });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 4. User: Subscribe to a plan
  subscribe: async (req, res) => {
    try {
      const userId = req.user.id;
      const { planId } = req.body;
      
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan || !plan.isActive) return res.status(404).json({ success: false, message: "Plan not found" });

      // DUPLICATE CHECK: Prevent subscribing to two active plans of the same module
      const activeSub = await prisma.userSubscription.findFirst({
        where: {
          userId,
          status: 'active',
          plan: { module: plan.module }
        }
      });

      if (activeSub) {
        return res.status(409).json({ 
          success: false, 
          message: `You already have an active subscription for the ${plan.module} module.` 
        });
      }

      // Clean up any old pending_payment subscription attempts for this module to allow fresh checkout retry
      await prisma.userSubscription.deleteMany({
        where: {
          userId,
          status: 'pending_payment',
          plan: { module: plan.module }
        }
      });

      const optIn = req.body.autoRenew === true || req.body.autoRenew === 'true';

      // Create Subscription (Status: pending_payment)
      const newSubscription = await prisma.userSubscription.create({
        data: { userId, planId, status: 'pending_payment', autoRenew: optIn }
      });

      // Create Transaction (Fix: amountUSD removed, metadata stringified)
      const newTransaction = await prisma.transaction.create({
        data: {
          type: "SUBSCRIPTION_PAYMENT",
          amount: plan.priceGHS, // mapping to required legacy field
          amountGHS: plan.priceGHS,
          currency: "GHS",
          provider: "PENDING_GATEWAY",
          status: "PENDING",
          userId: userId,
          metadata: JSON.stringify({ subscriptionId: newSubscription.id })
        }
      });

      return res.status(201).json({ success: true, subscription: newSubscription, transaction: newTransaction });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 5. User: Cancel subscription
  cancelSubscription: async (req, res) => {
    try {
      const userId = req.user.id;
      const { subscriptionId } = req.body;

      if (!subscriptionId) {
        return res.status(400).json({ success: false, message: "subscriptionId is required" });
      }

      const subscription = await prisma.userSubscription.findUnique({
        where: { id: subscriptionId }
      });

      if (!subscription) {
        return res.status(404).json({ success: false, message: "Subscription not found" });
      }

      if (subscription.userId !== userId) {
        return res.status(403).json({ success: false, message: "Unauthorized to cancel this subscription" });
      }

      // Cancel it by setting autoRenew to false and status to cancelled
      const updatedSub = await prisma.userSubscription.update({
        where: { id: subscriptionId },
        data: { autoRenew: false, status: 'cancelled' }
      });

      return res.status(200).json({ success: true, message: "Subscription cancelled successfully", subscription: updatedSub });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 6. User: Check active benefits/eligibility
  checkEligibility: async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      const eligibility = await checkPatientBenefits(userId, user.email);
      return res.status(200).json({ success: true, ...eligibility });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};
module.exports = subscriptionController;
