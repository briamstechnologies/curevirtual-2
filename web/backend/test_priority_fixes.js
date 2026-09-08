const prisma = require("./prisma/prismaClient");
const subscriptionController = require("./controllers/subscription.controller");
const transactionController = require("./controllers/transaction.controller");

// Helper to mock express response
function mockRes() {
  const res = {
    statusCode: 200,
    jsonPayload: null,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(payload) {
      this.jsonPayload = payload;
      return this;
    }
  };
  return res;
}

async function runTests() {
  console.log("=== Verification: Priority Fixes Audits ===\n");

  const createdUserIds = [];
  const createdPlanIds = [];
  const createdSubIds = [];
  const createdTransactionIds = [];

  try {
    // 1. Create two test patient users
    const patientUser1 = await prisma.user.create({
      data: {
        firstName: "Alice",
        lastName: "Test",
        email: `alice.test.${Date.now()}@test.com`,
        role: "PATIENT",
        dateOfBirth: new Date("1992-05-15"),
        gender: "FEMALE"
      }
    });
    createdUserIds.push(patientUser1.id);

    const patientUser2 = await prisma.user.create({
      data: {
        firstName: "Bob",
        lastName: "Test",
        email: `bob.test.${Date.now()}@test.com`,
        role: "PATIENT",
        dateOfBirth: new Date("1991-08-20"),
        gender: "MALE"
      }
    });
    createdUserIds.push(patientUser2.id);

    // Get or Create Subscription Plan
    let plan = await prisma.subscriptionPlan.findFirst({ where: { isActive: true } });
    if (!plan) {
      plan = await prisma.subscriptionPlan.create({
        data: {
          name: "Test Gold Plan",
          module: "doctor",
          priceGHS: 50.0,
          billingPeriod: "monthly",
          isActive: true
        }
      });
      createdPlanIds.push(plan.id);
    }

    // -------------------------------------------------------------
    // FIX 1: Subscription autoRenew defaults to false
    // -------------------------------------------------------------
    console.log("--- FIX 1: Subscription autoRenew default logic ---");
    
    const reqSub = {
      user: { id: patientUser1.id },
      body: { planId: plan.id }
    };
    const resSub = mockRes();
    await subscriptionController.subscribe(reqSub, resSub);

    if (resSub.statusCode === 201) {
      const payload = resSub.jsonPayload;
      // Fetch user subscription from database to inspect autoRenew field
      const subInDb = await prisma.userSubscription.findFirst({
        where: { userId: patientUser1.id, planId: plan.id }
      });
      
      if (subInDb) {
        createdSubIds.push(subInDb.id);
        console.log("Created Subscription autoRenew field:", subInDb.autoRenew);

        if (subInDb.autoRenew === false) {
          console.log("\x1b[32m✅ PASS: autoRenew defaulted to false correctly.\x1b[0m");
        } else {
          console.error("\x1b[31m❌ FAIL: autoRenew was true. It should default to false.\x1b[0m");
        }
      } else {
        console.error("❌ FAIL: UserSubscription record was not created in database.");
      }
    } else {
      console.error(`❌ FAIL: Subscription creation returned status ${resSub.statusCode}:`, resSub.jsonPayload);
    }

    // -------------------------------------------------------------
    // FIX 2: GET /api/transactions/:id/receipt Endpoint
    // -------------------------------------------------------------
    console.log("\n--- FIX 2: GET /api/transactions/:id/receipt Endpoint ---");

    // Create a base transaction for Patient User 1
    const testTx = await prisma.transaction.create({
      data: {
        userId: patientUser1.id,
        type: "CONSULTATION_PAYMENT",
        status: "SUCCESS",
        amount: 150.0,
        amountGHS: 150.0,
        currency: "GHS",
        provider: "PAYSTACK",
        providerTxId: "pstk-ref-12345",
        platformCommission: 15.0,
        providerPayout: 135.0
      }
    });
    createdTransactionIds.push(testTx.id);

    // Scenario A: Owner fetches receipt
    console.log("Scenario A: Owner fetches receipt...");
    const reqOwner = {
      user: { id: patientUser1.id, role: "PATIENT" },
      params: { id: testTx.id }
    };
    const resOwner = mockRes();
    await transactionController.getTransactionReceipt(reqOwner, resOwner);

    if (resOwner.statusCode === 200) {
      const receipt = resOwner.jsonPayload.receipt;
      console.log("Returned Receipt:", receipt);
      if (
        receipt &&
        receipt.id === testTx.id &&
        receipt.amount === 150.0 &&
        receipt.currency === "GHS" &&
        receipt.platformCommission === 15.0 &&
        receipt.providerPayout === 135.0 &&
        receipt.paymentStatus === "SUCCESS" &&
        receipt.paymentReference === "pstk-ref-12345"
      ) {
        console.log("\x1b[32m✅ PASS: Receipt details matched and resolved correctly.\x1b[0m");
      } else {
        console.error("\x1b[31m❌ FAIL: Receipt details mismatched.\x1b[0m");
      }
    } else {
      console.error(`❌ FAIL: Owner fetching receipt returned status ${resOwner.statusCode}:`, resOwner.jsonPayload);
    }

    // Scenario B: Non-existent receipt (404)
    console.log("\nScenario B: Fetch receipt with fake ID...");
    const reqFake = {
      user: { id: patientUser1.id, role: "PATIENT" },
      params: { id: "00000000-0000-0000-0000-000000000000" }
    };
    const resFake = mockRes();
    await transactionController.getTransactionReceipt(reqFake, resFake);

    console.log("Returned Status Code (expected 404):", resFake.statusCode);
    if (resFake.statusCode === 404) {
      console.log("\x1b[32m✅ PASS: Correctly returned 404 for invalid ID.\x1b[0m");
    } else {
      console.error(`❌ FAIL: Expected 404, got ${resFake.statusCode}`);
    }

    // Scenario C: Unauthorized patient user fetches receipt (403)
    console.log("\nScenario C: Unauthorized user tries to fetch receipt...");
    const reqUnauth = {
      user: { id: patientUser2.id, role: "PATIENT" },
      params: { id: testTx.id }
    };
    const resUnauth = mockRes();
    await transactionController.getTransactionReceipt(reqUnauth, resUnauth);

    console.log("Returned Status Code (expected 403):", resUnauth.statusCode);
    if (resUnauth.statusCode === 403) {
      console.log("\x1b[32m✅ PASS: Correctly rejected access with 403.\x1b[0m");
    } else {
      console.error(`❌ FAIL: Expected 403, got ${resUnauth.statusCode}`);
    }

  } catch (error) {
    console.error("❌ Test run encountered error:", error);
  } finally {
    console.log("\n🧹 Cleaning up test data...");

    if (createdUserIds.length > 0) {
      await prisma.transaction.deleteMany({ where: { userId: { in: createdUserIds } } }).catch(e => {});
    }
    if (createdTransactionIds.length > 0) {
      await prisma.transaction.deleteMany({ where: { id: { in: createdTransactionIds } } }).catch(e => {});
    }
    if (createdSubIds.length > 0) {
      await prisma.userSubscription.deleteMany({ where: { id: { in: createdSubIds } } }).catch(e => {});
    }
    if (createdPlanIds.length > 0) {
      await prisma.subscriptionPlan.deleteMany({ where: { id: { in: createdPlanIds } } }).catch(e => {});
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }).catch(e => {});
    }

    console.log("Cleanup finished.");
  }
}

runTests()
  .then(() => prisma.$disconnect())
  .catch(console.error);
