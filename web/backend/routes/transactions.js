const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { verifyToken } = require('../middleware/rbac');

// All transaction routes require authentication
router.use(verifyToken);

// POST /api/transactions/consult
router.post('/consult', transactionController.bookConsultation);

// GET /api/transactions/:id/receipt
router.get('/:id/receipt', transactionController.getTransactionReceipt);

module.exports = router;
