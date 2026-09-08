const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");
const { authenticateToken } = require("../middleware/auth");

// 1. Initiate Payment
router.post("/initiate", authenticateToken, paymentController.initiatePayment);

// 2. Verify Payment Status manually
router.get("/:reference/status", authenticateToken, paymentController.verifyPaymentStatus);

// 3. Webhook (Safely captures raw body string for HMAC signature verification)
router.post(
  "/webhook", 
  (req, res, next) => {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      req.rawBody = JSON.stringify(req.body);
    } else if (Buffer.isBuffer(req.body)) {
      req.rawBody = req.body.toString('utf8');
      try {
        req.body = JSON.parse(req.rawBody);
      } catch(e) {}
    } else {
      req.rawBody = req.body;
    }
    next();
  },
  paymentController.paystackWebhook
);

module.exports = router;
