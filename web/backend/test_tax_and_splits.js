const prisma = require("./prisma/prismaClient");
const paRouter = require("./routes/paApi");
const { processTransactionPayout } = require("./services/commissionService");

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

// Extract handlers
const assignDocRoute = paRouter.stack.find(l => l.route && l.route.path === "/assign-doctor").route;
const assignDocHandler = assignDocRoute.stack[assignDocRoute.stack.length - 1].handle;

const getSplitRoute = paRouter.stack.find(l => l.route && l.route.path === "/:id/revenue-split" && l.route.methods.get).route;
const getSplitHandler = getSplitRoute.stack[getSplitRoute.stack.length - 1].handle;

const putSplitRoute = paRouter.stack.find(l => l.route && l.route.path === "/:id/revenue-split" && l.route.methods.put).route;
const putSplitHandler = putSplitRoute.stack[putSplitRoute.stack.length - 1].handle;

async function runTests() {
  console.log("=== Phase 9: PA Revenue Splits & Tax Calculations Verification ===\n");

  const createdUserIds = [];
  const createdDocProfileIds = [];
  const createdPaProfileIds = [];
  const createdAssignmentIds = [];
  const createdSplitIds = [];
  const createdTransactionIds = [];

  try {
    // -------------------------------------------------------------
    // Set up test users: Admin, Doctor, PA
    // -------------------------------------------------------------
    const adminUser = { id: "admin-test-uid", role: "ADMIN" };

    const docUser = await prisma.user.create({
      data: {
        firstName: "Supervising",
        lastName: "Doctor",
        email: `sup.doc.test.${Date.now()}@test.com`,
        role: "DOCTOR",
        dateOfBirth: new Date("1980-01-01"),
        gender: "MALE"
      }
    });
    createdUserIds.push(docUser.id);

    const docProfile = await prisma.doctorProfile.create({
      data: {
        userId: docUser.id,
        consultationFee: 150.0,
        licenseNumber: `LIC-DOC-${Date.now()}`,
        specialization: "General Practice",
        qualifications: "MD"
      }
    });
    createdDocProfileIds.push(docProfile.id);

    const paUser = await prisma.user.create({
      data: {
        firstName: "Assistant",
        lastName: "PA",
        email: `assist.pa.test.${Date.now()}@test.com`,
        role: "PHYSICIAN_ASSISTANT",
        dateOfBirth: new Date("1993-10-10"),
        gender: "FEMALE"
      }
    });
    createdUserIds.push(paUser.id);

    const paProfile = await prisma.physicianAssistantProfile.create({
      data: {
        userId: paUser.id,
        licenseNumber: `LIC-PA-${Date.now()}`,
        specialty: "Primary Care"
      }
    });
    createdPaProfileIds.push(paProfile.id);

    // -------------------------------------------------------------
    // TEST 1: POST /api/pa/assign-doctor (Default 70/30)
    // -------------------------------------------------------------
    console.log("--- TEST 1: Assign Doctor to PA ---");
    const reqAssign = {
      user: adminUser,
      body: {
        paUserId: paUser.id,
        doctorUserId: docUser.id
      }
    };
    const resAssign = mockRes();
    await assignDocHandler(reqAssign, resAssign);

    console.log("Assign status:", resAssign.statusCode);
    if (resAssign.statusCode === 200) {
      console.log("Message:", resAssign.jsonPayload.message);
      console.log("Created Split:", resAssign.jsonPayload.split);
      createdAssignmentIds.push(resAssign.jsonPayload.assignment.id);
      createdSplitIds.push(resAssign.jsonPayload.split.id);

      if (
        resAssign.jsonPayload.split.paSharePct === 70.0 &&
        resAssign.jsonPayload.split.doctorSharePct === 30.0
      ) {
        console.log("\x1b[32m✅ PASS: Successfully assigned supervising doctor with default 70/30 split.\x1b[0m");
      } else {
        console.error("❌ FAIL: Incorrect default split percentages.");
      }
    } else {
      console.error("❌ FAIL: Assignment endpoint failed:", resAssign.jsonPayload);
    }

    // -------------------------------------------------------------
    // TEST 2: GET /api/pa/:id/revenue-split
    // -------------------------------------------------------------
    console.log("\n--- TEST 2: GET Split (Multiple Roles) ---");
    // Owner PA
    const reqGetPa = {
      user: { id: paUser.id, role: "PHYSICIAN_ASSISTANT" },
      params: { id: paProfile.id }
    };
    const resGetPa = mockRes();
    await getSplitHandler(reqGetPa, resGetPa);
    console.log("GET as PA status:", resGetPa.statusCode, resGetPa.jsonPayload);

    // Supervising Doctor
    const reqGetDoc = {
      user: { id: docUser.id, role: "DOCTOR" },
      params: { id: paProfile.id }
    };
    const resGetDoc = mockRes();
    await getSplitHandler(reqGetDoc, resGetDoc);
    console.log("GET as Doctor status:", resGetDoc.statusCode, resGetDoc.jsonPayload);

    if (
      resGetPa.statusCode === 200 &&
      resGetPa.jsonPayload.paSharePct === 70.0 &&
      resGetDoc.statusCode === 200 &&
      resGetDoc.jsonPayload.doctorName === "Supervising Doctor"
    ) {
      console.log("\x1b[32m✅ PASS: GET split exposed correctly to authorized users.\x1b[0m");
    } else {
      console.error("❌ FAIL: GET split failed.");
    }

    // -------------------------------------------------------------
    // TEST 3: PUT /api/pa/:id/revenue-split (Update split & valid sum)
    // -------------------------------------------------------------
    console.log("\n--- TEST 3: PUT Split (supervising doctor update) ---");
    const reqPutDoc = {
      user: { id: docUser.id, role: "DOCTOR" },
      params: { id: paProfile.id },
      body: {
        paSharePct: 60.0,
        doctorSharePct: 40.0
      }
    };
    const resPutDoc = mockRes();
    await putSplitHandler(reqPutDoc, resPutDoc);
    console.log("PUT status:", resPutDoc.statusCode);

    if (resPutDoc.statusCode === 200) {
      console.log("Updated Split:", resPutDoc.jsonPayload.split);
      if (
        resPutDoc.jsonPayload.split.paSharePct === 60.0 &&
        resPutDoc.jsonPayload.split.doctorSharePct === 40.0
      ) {
        console.log("\x1b[32m✅ PASS: Supervising doctor successfully adjusted split to 60/40.\x1b[0m");
      } else {
        console.error("❌ FAIL: Updated split percentages do not match.");
      }
    } else {
      console.error("❌ FAIL: PUT split failed.");
    }

    // Test invalid sum (60/50)
    console.log("\nTesting invalid sum (60/50) split rejection...");
    const reqPutInvalid = {
      user: { id: docUser.id, role: "DOCTOR" },
      params: { id: paProfile.id },
      body: {
        paSharePct: 60.0,
        doctorSharePct: 50.0
      }
    };
    const resPutInvalid = mockRes();
    await putSplitHandler(reqPutInvalid, resPutInvalid);
    console.log("PUT invalid status:", resPutInvalid.statusCode);
    if (resPutInvalid.statusCode === 400) {
      console.log("\x1b[32m✅ PASS: Correctly rejected splits that do not sum to 100.\x1b[0m");
    } else {
      console.error(`❌ FAIL: Expected 400, got ${resPutInvalid.statusCode}`);
    }

    // -------------------------------------------------------------
    // TEST 4: PUT authorization - PA themselves gets 403
    // -------------------------------------------------------------
    console.log("\n--- TEST 4: Reject split updates by the PA themselves ---");
    const reqPutPa = {
      user: { id: paUser.id, role: "PHYSICIAN_ASSISTANT" },
      params: { id: paProfile.id },
      body: {
        paSharePct: 80.0,
        doctorSharePct: 20.0
      }
    };
    const resPutPa = mockRes();
    await putSplitHandler(reqPutPa, resPutPa);
    console.log("PUT status for PA self-change:", resPutPa.statusCode);
    if (resPutPa.statusCode === 403) {
      console.log("\x1b[32m✅ PASS: PA forbidden from adjusting their own cut.\x1b[0m");
    } else {
      console.error(`❌ FAIL: Expected 403, got ${resPutPa.statusCode}`);
    }

    // -------------------------------------------------------------
    // TEST 5: VAT thresholds under GHS 200,000 (No tax)
    // -------------------------------------------------------------
    console.log("\n--- TEST 5: Under VAT Threshold Calculation ---");
    const txUnder = await prisma.transaction.create({
      data: {
        userId: docUser.id,
        type: "CONSULTATION_PAYMENT",
        status: "SUCCESS",
        amount: 100.0,
        amountGHS: 100.0,
        currency: "GHS",
        provider: "PAYSTACK",
        paId: paProfile.id,
        supervisingDoctorId: docProfile.id
      }
    });
    createdTransactionIds.push(txUnder.id);

    await processTransactionPayout(txUnder.id);
    const updatedTxUnder = await prisma.transaction.findUnique({ where: { id: txUnder.id } });
    
    let metadataUnder = {};
    try { metadataUnder = JSON.parse(updatedTxUnder.metadata || "{}"); } catch(e) {}
    console.log("Metadata calculated for under-threshold tx:", metadataUnder);
    
    if (metadataUnder.vatAmount === undefined || metadataUnder.vatAmount === 0.0) {
      console.log("\x1b[32m✅ PASS: VAT was not applied (turnover under threshold).\x1b[0m");
    } else {
      console.error("❌ FAIL: VAT was applied when turnover was under threshold.");
    }

    // -------------------------------------------------------------
    // TEST 6: Simulated VAT thresholds crossing (Apply 20% tax)
    // -------------------------------------------------------------
    console.log("\n--- TEST 6: Simulated Over VAT Threshold (GHS 200,000+) ---");
    // Create a massive success transaction to cross GHS 200,000 threshold
    const txMassive = await prisma.transaction.create({
      data: {
        userId: docUser.id,
        type: "CONSULTATION_PAYMENT",
        status: "SUCCESS",
        amount: 300000.0,
        amountGHS: 300000.0,
        currency: "GHS",
        provider: "PAYSTACK",
        platformCommission: 250000.0 // set commission high to cross threshold
      }
    });
    createdTransactionIds.push(txMassive.id);

    // Create a new consultation transaction
    const txOver = await prisma.transaction.create({
      data: {
        userId: docUser.id,
        type: "CONSULTATION_PAYMENT",
        status: "SUCCESS",
        amount: 100.0,
        amountGHS: 100.0,
        currency: "GHS",
        provider: "PAYSTACK",
        paId: paProfile.id,
        supervisingDoctorId: docProfile.id
      }
    });
    createdTransactionIds.push(txOver.id);

    await processTransactionPayout(txOver.id);
    const updatedTxOver = await prisma.transaction.findUnique({ where: { id: txOver.id } });

    let metadataOver = {};
    try { metadataOver = JSON.parse(updatedTxOver.metadata || "{}"); } catch(e) {}
    console.log("Metadata calculated for over-threshold tx:", metadataOver);

    // Expecting:
    // GHS 100 consultation amount.
    // 60/40 PA split is updated, but platform commission on PA consult is 10% (GHS 10).
    // VAT on commission is 20% of platform commission: 10 * 0.20 = 2.0 GHS.
    if (metadataOver.vatAmount === 2.0 && metadataOver.vatRate === 20.0) {
      console.log("\x1b[32m✅ PASS: VAT calculated correctly at 20% (GHS 2.00) after crossing threshold.\x1b[0m");
    } else {
      console.error(`❌ FAIL: Incorrect VAT amount. Expected 2.0, got ${metadataOver.vatAmount}`);
    }

  } catch (error) {
    console.error("❌ Test run encountered error:", error);
  } finally {
    console.log("\n🧹 Cleaning up test data...");

    if (createdTransactionIds.length > 0) {
      await prisma.transaction.deleteMany({ where: { id: { in: createdTransactionIds } } }).catch(e => {});
    }
    if (createdSplitIds.length > 0) {
      await prisma.paRevenueSplit.deleteMany({ where: { id: { in: createdSplitIds } } }).catch(e => {});
    }
    if (createdAssignmentIds.length > 0) {
      await prisma.doctorPAAssignment.deleteMany({ where: { id: { in: createdAssignmentIds } } }).catch(e => {});
    }
    if (createdPaProfileIds.length > 0) {
      await prisma.physicianAssistantProfile.deleteMany({ where: { id: { in: createdPaProfileIds } } }).catch(e => {});
    }
    if (createdDocProfileIds.length > 0) {
      await prisma.doctorProfile.deleteMany({ where: { id: { in: createdDocProfileIds } } }).catch(e => {});
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
