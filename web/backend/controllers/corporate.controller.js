const prisma = require("../prisma/prismaClient");

const corporateController = {
  createAccount: async (req, res) => {
    try {
      const { companyName, contactEmail, maxSeats = 5, pricePerSeatGHS, billingCycle = "monthly" } = req.body;

      if (!companyName || !contactEmail) {
        return res.status(400).json({ success: false, message: "companyName and contactEmail are required" });
      }

      // ENFORCE MINIMUM 5 SEATS RULE
      const parsedMaxSeats = parseInt(maxSeats, 10);
      if (isNaN(parsedMaxSeats) || parsedMaxSeats < 5) {
        return res.status(400).json({ 
          success: false, 
          message: "Minimum 5 seats required for corporate accounts" 
        });
      }

      // SECTION 6 TIERED PRICING: Calculate default price per seat based on company size and assign seatTier
      let seatTier = "small";
      let defaultPrice = 20.0;

      if (parsedMaxSeats >= 200) {
        seatTier = "large";
        defaultPrice = 12.0; // Large tier: GHS 8-15 (negotiable)
      } else if (parsedMaxSeats >= 50) {
        seatTier = "mid";
        defaultPrice = 14.0; // Mid tier: GHS 10-18 (recommend 14)
      } else {
        seatTier = "small";
        defaultPrice = 20.0; // Small tier: GHS 15-25 (recommend 20)
      }

      let finalPricePerSeat;
      // Allow manual override of default price
      if (pricePerSeatGHS !== undefined && pricePerSeatGHS !== null && pricePerSeatGHS !== "") {
        finalPricePerSeat = parseFloat(pricePerSeatGHS);
      } else {
        finalPricePerSeat = defaultPrice;
        // Apply 15% Annual Billing Discount ONLY if using the default price
        if (billingCycle && billingCycle.toLowerCase() === 'annual') {
          finalPricePerSeat = finalPricePerSeat * 0.85;
        }
      }

      const existingAccount = await prisma.corporateAccount.findUnique({
        where: { contactEmail }
      });

      if (existingAccount) {
        return res.status(409).json({ success: false, message: "A corporate account with this contactEmail already exists" });
      }

      const newAccount = await prisma.corporateAccount.create({
        data: {
          companyName,
          contactEmail,
          maxSeats: parsedMaxSeats,
          activeEmployees: 0,
          pricePerSeatGHS: finalPricePerSeat,
          seatTier,
          billingCycle: billingCycle.toLowerCase(),
          isActive: true
        }
      });

      return res.status(201).json({ success: true, account: newAccount });
    } catch (error) {
      console.error("Error creating corporate account:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 2. Add Employee Seat (Atomic Capacity Check & Increment inside $transaction)
  addSeat: async (req, res) => {
    try {
      const { id: accountId } = req.params;
      const { employeeEmail } = req.body;

      if (!employeeEmail) {
        return res.status(400).json({ success: false, message: "employeeEmail is required" });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Fetch account inside transaction for strict concurrency check
        const account = await tx.corporateAccount.findUnique({
          where: { id: accountId }
        });

        if (!account || !account.isActive) {
          return { errorStatus: 404, errorMessage: "Corporate account not found or inactive" };
        }

        // 1. DUPLICATE CHECK (Check if employee already assigned FIRST for better error reporting)
        const existingSeat = await tx.corporateSeat.findUnique({
          where: {
            corporateAccountId_employeeEmail: {
              corporateAccountId: accountId,
              employeeEmail: employeeEmail.toLowerCase()
            }
          }
        });

        if (existingSeat) {
          return { errorStatus: 409, errorMessage: "Employee seat is already assigned to this corporate account" };
        }

        // 2. STRICT CAPACITY CHECK
        if (account.activeEmployees >= account.maxSeats) {
          return { 
            errorStatus: 400, 
            errorMessage: `Corporate seat limit reached (${account.activeEmployees}/${account.maxSeats}). Please upgrade maxSeats.` 
          };
        }

        // Check if employee user exists in system to link employeeUserId
        const user = await tx.user.findFirst({
          where: { email: employeeEmail.toLowerCase() }
        });

        // ATOMIC INCREMENT of activeEmployees counter
        await tx.corporateAccount.update({
          where: { id: accountId },
          data: { activeEmployees: { increment: 1 } }
        });

        // Create CorporateSeat
        const newSeat = await tx.corporateSeat.create({
          data: {
            corporateAccountId: accountId,
            employeeEmail: employeeEmail.toLowerCase(),
            employeeUserId: user ? user.id : null,
            status: "active"
          }
        });

        return { success: true, seat: newSeat };
      });

      if (result.errorStatus) {
        return res.status(result.errorStatus).json({ success: false, message: result.errorMessage });
      }

      return res.status(201).json({ success: true, seat: result.seat });

    } catch (error) {
      console.error("Error adding corporate seat:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 3. Remove Employee Seat (Atomic Decrement inside $transaction)
  removeSeat: async (req, res) => {
    try {
      const { id: accountId, seatId } = req.params;

      const result = await prisma.$transaction(async (tx) => {
        const seat = await tx.corporateSeat.findFirst({
          where: { id: seatId, corporateAccountId: accountId }
        });

        if (!seat) {
          return { errorStatus: 404, errorMessage: "Corporate seat not found for this account" };
        }

        // Delete seat
        await tx.corporateSeat.delete({
          where: { id: seatId }
        });

        // ATOMIC DECREMENT of activeEmployees counter
        await tx.corporateAccount.update({
          where: { id: accountId },
          data: { activeEmployees: { decrement: 1 } }
        });

        return { success: true };
      });

      if (result.errorStatus) {
        return res.status(result.errorStatus).json({ success: false, message: result.errorMessage });
      }

      return res.status(200).json({ success: true, message: "Corporate seat revoked and deleted successfully" });

    } catch (error) {
      console.error("Error removing corporate seat:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 4. Get Account Details with Seats
  getAccountDetails: async (req, res) => {
    try {
      const { id: accountId } = req.params;

      const account = await prisma.corporateAccount.findUnique({
        where: { id: accountId },
        include: {
          seats: {
            include: {
              employeeUser: {
                select: { id: true, email: true, role: true }
              }
            }
          }
        }
      });

      if (!account) {
        return res.status(404).json({ success: false, message: "Corporate account not found" });
      }

      return res.status(200).json({ success: true, account });
    } catch (error) {
      console.error("Error fetching corporate account:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 5. Get All Corporate Accounts (Admin List)
  getAllAccounts: async (req, res) => {
    try {
      const accounts = await prisma.corporateAccount.findMany({
        include: {
          seats: {
            include: {
              employeeUser: {
                select: { id: true, email: true, role: true }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" }
      });
      return res.status(200).json({ success: true, accounts });
    } catch (error) {
      console.error("Error fetching corporate accounts list:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 6. Delete Corporate Account (Admin Only)
  deleteAccount: async (req, res) => {
    try {
      const { id: accountId } = req.params;

      await prisma.$transaction([
        prisma.corporateSeat.deleteMany({ where: { corporateAccountId: accountId } }),
        prisma.corporateAccount.delete({ where: { id: accountId } })
      ]);

      return res.status(200).json({ success: true, message: "Corporate account deleted successfully" });
    } catch (error) {
      console.error("Error deleting corporate account:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = corporateController;
