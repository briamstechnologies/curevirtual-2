const crypto = require("crypto");
const prisma = require("../prisma/prismaClient");
const { processTransactionPayout } = require("../services/commissionService");
const { calculateSubscriptionExpiry } = require("../utils/dateHelper");

const getSecretKey = () => (process.env.PAYSTACK_SECRET_KEY || "").trim().replace(/^"|"$/g, '');

// Section 10: FX Rate Daily Cache for Diaspora GHS to USD Conversions
let fxCache = { rate: 0.088, lastUpdated: 0 }; // Default 1 GHS = ~0.088 USD
function getCachedGhsToUsdRate() {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (now - fxCache.lastUpdated > oneDayMs) {
        // Daily refresh simulation / fallback logic
        fxCache.rate = parseFloat(process.env.FX_GHS_TO_USD_RATE || 0.088);
        fxCache.lastUpdated = now;
    }
    return fxCache.rate;
}

const paymentController = {
  // 1. Initiate Payment
  initiatePayment: async (req, res) => {
    try {
      const { transactionId } = req.body;
      if (!transactionId) return res.status(400).json({ success: false, message: "transactionId is required" });

      const tx = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { user: true }
      });

      if (!tx) return res.status(404).json({ success: false, message: "Transaction not found" });

      // Idempotency: Prevent re-initializing completed transactions
      if (tx.status === "SUCCESS") {
        return res.status(400).json({ success: false, message: "Transaction already completed" });
      }

      let userEmail = tx.user?.email || "customer@curevirtual.com";

      // Convert GHS to Kobo (multiply by 100)
      const amountGHS = parseFloat(tx.amountGHS || tx.amount || 0);
      const amountKobo = Math.round(amountGHS * 100);

      const payload = {
        email: userEmail,
        amount: amountKobo,
        currency: "GHS", // Section 10: Always GHS for Paystack Ghana gateway to support MoMo/Cards
        channels: ["mobile_money", "card", "ussd"], // Section 10: MoMo, Card, and USSD Push Fallback
        metadata: { transactionId: tx.id }
      };

      const response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${getSecretKey()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!data.status) throw new Error(data.message || "Paystack initialization failed");

      return res.status(200).json({
        success: true,
        authorization_url: data.data.authorization_url,
        reference: data.data.reference
      });
    } catch (error) {
      console.error("Paystack Initiate Error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 2. Webhook
  paystackWebhook: async (req, res) => {
    try {
      const paystackHeader = req.headers["x-paystack-signature"];
      const secret = getSecretKey();

      const bodyToSign = req.rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
      const hash = crypto.createHmac("sha512", secret).update(bodyToSign).digest("hex");

      if (!paystackHeader || hash !== paystackHeader) {
        console.error("❌ CRITICAL: Paystack Webhook Signature Verification Failed!");
        return res.status(401).json({ success: false, message: "Unauthorized. Invalid Signature." });
      }

      const event = req.body;

      if (event.event === "charge.success") {
        const txId = event.data.metadata?.transactionId;
        if (!txId) return res.status(200).send("OK");

        const tx = await prisma.transaction.findUnique({ where: { id: txId } });
        if (!tx) {
          console.warn(`Transaction ${txId} not found for webhook charge.success`);
          return res.status(200).send("OK");
        }

        // 2. IDEMPOTENCY CHECK: Prevent double processing
        if (tx.status === "SUCCESS") {
          console.log(`[Idempotency] Transaction ${txId} is already SUCCESS. Skipping commission split.`);
          return res.status(200).send("OK");
        }

        // Update Transaction to SUCCESS
        await prisma.transaction.update({
          where: { id: txId },
          data: { status: "SUCCESS", providerTxId: event.data.reference, provider: "PAYSTACK" }
        });

        console.log(`✅ Payment Confirmed for TX: ${txId}`);

        // 3. TRIGGER PROCESS PAYOUT (Phase 2 & 3 integrations)
        try {
          if (typeof processTransactionPayout === 'function') {
             await processTransactionPayout(txId);
             console.log(`✅ Commission Split calculated for TX: ${txId}`);
          }
        } catch(e) { console.error("Error during commission payout split:", e); }

        // 4. TRIGGER SUBSCRIPTION ACTIVATION (Phase 4 integration)
        if (tx.type === "SUBSCRIPTION_PAYMENT") {
            let metadataObj = {};
            try { metadataObj = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata; } catch(e) {}
            
            const subId = metadataObj?.subscriptionId;
            if (subId) {
                const sub = await prisma.userSubscription.findUnique({
                    where: { id: subId },
                    include: { plan: true }
                });
                if (sub) {
                    const startedAt = new Date();
                    const expiresAt = calculateSubscriptionExpiry(startedAt, sub.plan?.billingCycle || 'monthly');
                    await prisma.userSubscription.update({
                       where: { id: subId },
                       data: { status: "active", startedAt, expiresAt }
                    });
                    console.log(`✅ Subscription ${subId} activated successfully until ${expiresAt.toISOString()}!`);
                }
            }
        }
      }

      return res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook Error:", error);
      return res.status(500).json({ success: false, message: error.message, stack: error.stack });
    }
  },

  // 3. Verify Payment Status manually (Syncs DB locally on success)
  verifyPaymentStatus: async (req, res) => {
    try {
      const { reference } = req.params;
      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${getSecretKey()}` }
      });
      const data = await response.json();

      if (data.status && data.data?.status === "success") {
        const txId = data.data.metadata?.transactionId;
        
        // Find transaction
        const tx = await prisma.transaction.findFirst({
          where: {
            OR: [
              { id: txId || "" },
              { providerTxId: reference }
            ]
          }
        });

        if (tx && tx.status !== "SUCCESS") {
          // Update transaction
          await prisma.transaction.update({
            where: { id: tx.id },
            data: { status: "SUCCESS", providerTxId: reference, provider: "PAYSTACK" }
          });

          console.log(`✅ [Manual Verify] Payment Confirmed for TX: ${tx.id}`);

          // Trigger payout commission split
          try {
            if (typeof processTransactionPayout === 'function') {
               await processTransactionPayout(tx.id);
            }
          } catch(e) { console.error("Error during commission payout split:", e); }

          // Trigger subscription activation
          if (tx.type === "SUBSCRIPTION_PAYMENT") {
            let metadataObj = {};
            try { metadataObj = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata; } catch(e) {}
            
            const subId = metadataObj?.subscriptionId;
            if (subId) {
              const sub = await prisma.userSubscription.findUnique({
                where: { id: subId },
                include: { plan: true }
              });
              if (sub) {
                const startedAt = new Date();
                const expiresAt = calculateSubscriptionExpiry(startedAt, sub.plan?.billingCycle || 'monthly');
                await prisma.userSubscription.update({
                  where: { id: subId },
                  data: { status: "active", startedAt, expiresAt }
                });
                console.log(`✅ [Manual Verify] Subscription ${subId} activated successfully until ${expiresAt.toISOString()}!`);
              }
            }
          }
        }
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error("Manual Verification Error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = paymentController;
