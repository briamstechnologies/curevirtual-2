const express = require('express');
const router = express.Router();
const paReviewController = require('../controllers/paReview.controller');
const { verifyToken } = require('../middleware/rbac');

// All pa-review routes require authentication
router.use(verifyToken);

// GET /api/pa-reviews/overdue-sla (Compliance SLA check)
router.get('/overdue-sla', paReviewController.checkSLAOverdueReviews);

// GET /api/pa-reviews
router.get('/', paReviewController.getConsultReviews);

// PUT /api/pa-reviews/:id
router.put('/:id', paReviewController.updateConsultReview);

module.exports = router;
