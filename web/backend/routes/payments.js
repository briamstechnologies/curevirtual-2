const express = require("express");
const router = express.Router();
const prisma = require("../prisma/prismaClient");
const Stripe = require("stripe");

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const { verifyToken } = require("../middleware/rbac");

/**
 * POST /api/payments/create-session-payment
 * Input: { appointmentId }
 * Description: Creates a Stripe Checkout session for a per-session consultation payment.
 */
router.post("/create-session-payment", verifyToken, async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const priceId = process.env.STRIPE_PRICE_ID_SESSION;

    if (!appointmentId) {
      return res.status(400).json({ error: "appointmentId is required" });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { 
        patient: { include: { user: true } },
        doctor: { include: { user: true } }
      }
    });

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { 
        appointmentId,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        type: "APPOINTMENT_PAYMENT" 
      },
      customer_email: req.user.email,
      success_url: `${process.env.APP_BASE_URL || 'https://curevirtual-2.vercel.app'}/patient/appointments?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_BASE_URL || 'https://curevirtual-2.vercel.app'}/patient/appointments?status=cancel`,
    });

    // Record the transaction in our database as PENDING
    await prisma.transaction.create({
      data: {
        userId: req.user.id,
        appointmentId,
        type: "APPOINTMENT_PAYMENT",
        amount: 10,
        currency: "usd",
        status: "PENDING",
        provider: "STRIPE",
        providerTxId: session.id,
        description: `Stripe checkout session created for appointment ${appointmentId}`
      }
    });

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "PENDING_PAYMENT", paymentId: session.id }
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ create-session-payment error:", err);
    res.status(500).json({ error: err.message || "Failed to create session payment" });
  }
});

/**
 * POST /api/payments/create-subscription
 * Input: { planType, userType }
 * Description: Creates a Stripe Checkout Session for a subscription.
 */
router.post("/create-subscription", verifyToken, async (req, res) => {
  try {
    const { planType, userType } = req.body; 
    const priceId = process.env.STRIPE_PRICE_ID_MONTHLY;
    const userId = req.user.id;

    // We can also allow them to use their specific pricing
    let finalPriceId = priceId;
    if (userType === 'PATIENT') finalPriceId = process.env.STRIPE_PRICE_ID_PATIENT_MONTHLY || priceId;
    if (userType === 'DOCTOR') finalPriceId = process.env.STRIPE_PRICE_ID_DOCTOR_MONTHLY || priceId;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: finalPriceId, quantity: 1 }],
      metadata: { userId, userType, plan: planType || "MONTHLY", type: "SUBSCRIPTION" },
      success_url: `${process.env.APP_BASE_URL || 'https://curevirtual-2.vercel.app'}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_BASE_URL || 'https://curevirtual-2.vercel.app'}/subscription-cancel`,
      customer_email: req.user.email
    });

    await prisma.subscription.create({
      data: {
        userId,
        plan: planType || "MONTHLY",
        status: "PENDING",
        provider: "STRIPE",
        reference: session.id,
        currency: "USD",
        stripeCustomerId: req.user?.stripeCustomerId || "customer_placeholder",
        stripeSubscriptionId: session.id,
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ create-subscription error:", err);
    res.status(500).json({ error: err.message || "Failed to create subscription" });
  }
});

/**
 * GET /api/payments/transactions
 * Description: Retrieves transaction history for the admin dashboard.
 */
router.get("/transactions", verifyToken, async (req, res) => {
  try {
    // Add superadmin/admin check here if needed via RBAC, currently verifyToken guarantees logged in
    const transactions = await prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, role: true } },
        appointment: { select: { id: true, appointmentDate: true, doctor: { include: { user: { select: { firstName: true, lastName: true } } } } } }
      }
    });
    
    res.json({ success: true, data: transactions });
  } catch (err) {
    console.error("❌ GET /transactions error:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

/**
 * POST /api/payments/webhook
 * Description: Unified webhook handler for Stripe events.
 * This is mounted in server.js with express.raw() to handle signature verification.
 */
router.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    // req.body must be the raw buffer here
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook Signature Verification Failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const dataObject = event.data.object;

    switch (event.type) {
      // Catch completed checkout sessions
      case "checkout.session.completed": {
        const session = event.data.object;
        const { type, appointmentId, plan } = session.metadata || {};
        const userId = session.metadata?.userId || session.client_reference_id;

        if (type === "APPOINTMENT_PAYMENT" && appointmentId) {
          await prisma.appointment.update({
            where: { id: appointmentId },
            data: { status: "APPROVED", paymentStatus: "PAID" }
          });
          const txn = await prisma.transaction.findFirst({ where: { providerTxId: session.id } });
          if (txn) {
            await prisma.transaction.update({
              where: { id: txn.id },
              data: { status: "SUCCESS" }
            });
          }
          console.log(`✅ Appointment ${appointmentId} confirmed via Stripe Checkout.`);
        } else if (type === "SUBSCRIPTION" && userId) {
          const subscriptionId = session.subscription || session.id;
          await prisma.subscription.updateMany({
            where: { userId, reference: session.id },
            data: {
              status: "ACTIVE",
              reference: String(subscriptionId),
              stripeSubscriptionId: String(subscriptionId),
              currency: "USD",
              plan: plan || "MONTHLY",
            },
          });
          
          await prisma.user.update({
            where: { id: userId },
            data: { subscriptionState: "ACTIVE" }
          });
          console.log(`🚀 Subscription ${subscriptionId} activated for user ${userId}.`);
        }
        break;
      }

      // One-time Payment (Appointment)
      case "payment_intent.succeeded": {
        const { appointmentId, type } = dataObject.metadata;
        if (type === "APPOINTMENT_PAYMENT" && appointmentId) {
          await prisma.appointment.update({
            where: { id: appointmentId },
            data: { status: "APPROVED", paymentStatus: "PAID" }
          });
          await prisma.transaction.update({
            where: { providerTxId: dataObject.id },
            data: { status: "SUCCESS" }
          });
          console.log(`✅ Appointment ${appointmentId} confirmed via Stripe.`);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const { appointmentId } = dataObject.metadata;
        if (appointmentId) {
          await prisma.appointment.update({
            where: { id: appointmentId },
            data: { status: "PAYMENT_FAILED", paymentStatus: "FAILED" }
          });
          console.log(`❌ Payment failed for appointment ${appointmentId}.`);
        }
        break;
      }

      // Subscriptions
      case "invoice.payment_succeeded": {
        const subscriptionId = dataObject.subscription;
        if (subscriptionId) {
          const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
          const updatedSub = await prisma.subscription.update({
            where: { stripeSubscriptionId: subscriptionId },
            data: { 
              status: "ACTIVE", 
              startDate: new Date(stripeSub.current_period_start * 1000),
              endDate: new Date(stripeSub.current_period_end * 1000)
            }
          });

          // Snapshot status on User
          await prisma.user.update({
            where: { id: updatedSub.userId },
            data: { subscriptionState: "ACTIVE" }
          });
          console.log(`🚀 Subscription ${subscriptionId} activated/renewed.`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const subscriptionId = dataObject.subscription;
        if (subscriptionId) {
          const sub = await prisma.subscription.update({
            where: { stripeSubscriptionId: subscriptionId },
            data: { status: "FAILED" }
          });
          await prisma.user.update({
            where: { id: sub.userId },
            data: { subscriptionState: "FAILED" }
          });
          console.log(`⚠️ Subscription payment failed for ${subscriptionId}.`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscriptionId = dataObject.id;
        const sub = await prisma.subscription.update({
          where: { stripeSubscriptionId: subscriptionId },
          data: { status: "DEACTIVATED" }
        });
        await prisma.user.update({
          where: { id: sub.userId },
          data: { subscriptionState: "DEACTIVATED" }
        });
        console.log(`🛑 Subscription ${subscriptionId} canceled.`);
        break;
      }

      default:
        console.log(`Unhandled Stripe event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("❌ Webhook Handling Error:", err);
    res.status(500).json({ error: "Webhook handler failed" });
  }
});

module.exports = router;
