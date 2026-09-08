const express = require("express");
const router = express.Router();
const corporateController = require("../controllers/corporate.controller");
const { authenticateToken } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");

// 1. Create Corporate Account (Admin Only)
router.post(
  "/accounts", 
  authenticateToken, 
  requireRole(["SUPERADMIN", "ADMIN"]), 
  corporateController.createAccount
);

// 1.5 Get All Corporate Accounts (Admin Only)
router.get(
  "/accounts", 
  authenticateToken, 
  requireRole(["SUPERADMIN", "ADMIN"]), 
  corporateController.getAllAccounts
);

// 2. Get Corporate Account Details
router.get(
  "/accounts/:id", 
  authenticateToken, 
  requireRole(["SUPERADMIN", "ADMIN"]), 
  corporateController.getAccountDetails
);

// 3. Add Employee Seat (Admin Only)
router.post(
  "/accounts/:id/seats", 
  authenticateToken, 
  requireRole(["SUPERADMIN", "ADMIN"]), 
  corporateController.addSeat
);

// 4. Remove Employee Seat (Admin Only)
router.delete(
  "/accounts/:id/seats/:seatId", 
  authenticateToken, 
  requireRole(["SUPERADMIN", "ADMIN"]), 
  corporateController.removeSeat
);

// 5. Delete Corporate Account (Admin Only)
router.delete(
  "/accounts/:id", 
  authenticateToken, 
  requireRole(["SUPERADMIN", "ADMIN"]), 
  corporateController.deleteAccount
);

module.exports = router;
