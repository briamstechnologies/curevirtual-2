const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// 1. Get all subscription plans
router.get('/plans', subscriptionController.getPlans);

// 2. Admin: Create a new subscription plan
// requireRole will ensure the user has SUPERADMIN or ADMIN privileges
router.post('/plans', authenticateToken, requireRole(['SUPERADMIN', 'ADMIN']), subscriptionController.createPlan);

// 3. User: Get my subscriptions
router.get('/me', authenticateToken, subscriptionController.getMySubscriptions);

// 3.5 User: Get eligibility and active benefits (subscription + corporate)
router.get('/eligibility', authenticateToken, subscriptionController.checkEligibility);

// 4. User: Subscribe to a plan
router.post('/subscribe', authenticateToken, subscriptionController.subscribe);

// 5. User: Cancel a subscription
router.post('/cancel', authenticateToken, subscriptionController.cancelSubscription);

module.exports = router;
