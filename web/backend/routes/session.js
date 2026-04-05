const express = require("express");
const router = express.Router();
const prisma = require("../prisma/prismaClient");
const Stripe = require("stripe");

const stripeSecret = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

const { verifyToken } = require("../middleware/rbac");

/**
 * POST /api/session/create
 * Creates a Stripe PaymentIntent for a session/consultation payment.
 * Returns the client_secret for Stripe Elements checkout.
 */
router.post("/create", verifyToken, async (req, res) => {
  try {
    const { doctorId, appointmentId } = req.body;
    const patientId = req.user.id; // Corrected: Use the logged-in user's ID

    if (!doctorId) {
      return res.status(400).json({ error: "doctorId is required" });
    }

    if (!stripe) {
      console.error("❌ Stripe is not configured: STRIPE_SECRET_KEY/STRIPE_SECRET missing.");
      return res.status(500).json({ error: "Stripe is not configured" });
    }

    // Amount is $10.00, Stripe expects smallest currency unit (cents for USD)
    const amountInCents = 1000;

    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      metadata: {
        patientId,
        doctorId,
        appointmentId: appointmentId || "",
        type: "APPOINTMENT_PAYMENT"
      },
      // You can add customer mapping here if needed.
    });

    if (appointmentId) {
      // Record transaction as PENDING in our database if we have appointmentId
      await prisma.transaction.create({
        data: {
          userId: patientId, // The person paying
          appointmentId,
          type: "APPOINTMENT_PAYMENT",
          amount: amountInCents / 100, // storing $10 or 1000? Let's use 10
          currency: "usd",
          status: "PENDING",
          provider: "STRIPE",
          providerTxId: paymentIntent.id,
          description: `Payment Intent for appointment ${appointmentId}`
        }
      });
      
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: "PENDING_PAYMENT", paymentId: paymentIntent.id }
      });
    }

    return res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("❌ /api/session/create Detailed Error:", {
      message: err.message,
      stack: err.stack,
      body: req.body,
      userId: req.user?.id
    });
    return res.status(500).json({ 
      error: "Failed to create session payment", 
      details: err.message 
    });
  }
});

module.exports = router;
