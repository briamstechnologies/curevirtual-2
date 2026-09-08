const prisma = require("./prisma/prismaClient");
const { processTransactionPayout } = require("./services/commissionService");

async function runTests() {
  console.log("=== Volume Commission Tier Evaluation Logic Verification ===\n");

  const createdUserIds = [];
  const createdLabProfileIds = [];
  const createdPharmacyProfileIds = [];
  const createdLabOrderIds = [];
  const createdMedicineOrderIds = [];
  const createdTransactionIds = [];

  try {
    // 0. Fetch existing doctor and patient profiles
    const doctor = await prisma.doctorProfile.findFirst();
    const patient = await prisma.patientProfile.findFirst();
    if (!doctor || !patient) {
      throw new Error("No doctor or patient profiles found in the database. Cannot run tests.");
    }
    console.log(`Using Supervising Doctor Profile ID: ${doctor.id}`);
    console.log(`Using Patient Profile ID: ${patient.id}\n`);

    // =========================================================================
    // SECTION A: LABORATORY PARTNER VERIFICATION
    // =========================================================================
    console.log("--------------------------------------------------");
    console.log("🧪 PART A: LABORATORY COMMISSION TIERS VERIFICATION");
    console.log("--------------------------------------------------");

    // 1. Create a Laboratory Partner
    const labUser = await prisma.user.create({
      data: {
        firstName: "Test Lab",
        lastName: "Owner",
        email: `test_lab_${Date.now()}@company.com`,
        role: "LABORATORY",
        dateOfBirth: new Date(),
        gender: "MALE",
        subscriptionState: "UNSUBSCRIBED"
      }
    });
    createdUserIds.push(labUser.id);

    const labProfile = await prisma.laboratoryProfile.create({
      data: {
        userId: labUser.id,
        laboratoryName: "Test Lab Co",
        verificationStatus: "VERIFIED"
      }
    });
    createdLabProfileIds.push(labProfile.id);
    console.log(`Created Test Laboratory Profile ID: ${labProfile.id}`);

    // Verification 1: trailing order count = 0 -> Tier 1 (15%)
    console.log("\n- Step A1: Trailing order count = 0. Creating 1st Lab Order...");
    const order1 = await prisma.labOrder.create({
      data: {
        doctorId: doctor.id,
        patientId: patient.id,
        laboratoryId: labProfile.id,
        testName: "Lab Test 1",
        status: "ORDERED"
      }
    });
    createdLabOrderIds.push(order1.id);

    const tx1 = await prisma.transaction.create({
      data: {
        userId: labUser.id,
        type: "LAB_ORDER_PAYMENT",
        status: "SUCCESS",
        amount: 100.0,
        amountGHS: 100.0,
        provider: "paystack",
        labOrderId: order1.id
      }
    });
    createdTransactionIds.push(tx1.id);

    const result1 = await processTransactionPayout(tx1.id);
    console.log(`  Commission Tier Applied: ${result1.commissionTierApplied}`);
    console.log(`  Platform Commission:     ${result1.platformCommission} GHS`);
    if (result1.commissionTierApplied === "Tier 1" && result1.platformCommission === 15.0) {
      console.log("  \x1b[32m✅ PASS: Correctly applied Tier 1 (15% commission) on 1st transaction.\x1b[0m");
    } else {
      console.error("  \x1b[31m❌ FAIL: Tier 1 commission calculation incorrect.\x1b[0m");
    }

    // Verification 2: Trailing order count = 50 -> Tier 2 (12%)
    console.log("\n- Step A2: Simulating 49 more trailing orders (total 50). Creating 2nd Lab Order...");
    const trailingLabOrders = [];
    for (let i = 0; i < 49; i++) {
      trailingLabOrders.push({
        doctorId: doctor.id,
        patientId: patient.id,
        laboratoryId: labProfile.id,
        testName: `Lab Test Trailing ${i}`,
        status: "COMPLETED"
      });
    }
    await prisma.labOrder.createMany({ data: trailingLabOrders });

    // Since we created them using createMany, we need to fetch their IDs for cleanup
    const allLabOrders = await prisma.labOrder.findMany({
      where: { laboratoryId: labProfile.id },
      select: { id: true }
    });
    allLabOrders.forEach(o => {
      if (!createdLabOrderIds.includes(o.id)) createdLabOrderIds.push(o.id);
    });

    const order2 = await prisma.labOrder.create({
      data: {
        doctorId: doctor.id,
        patientId: patient.id,
        laboratoryId: labProfile.id,
        testName: "Lab Test 51",
        status: "ORDERED"
      }
    });
    createdLabOrderIds.push(order2.id);

    const tx2 = await prisma.transaction.create({
      data: {
        userId: labUser.id,
        type: "LAB_ORDER_PAYMENT",
        status: "SUCCESS",
        amount: 100.0,
        amountGHS: 100.0,
        provider: "paystack",
        labOrderId: order2.id
      }
    });
    createdTransactionIds.push(tx2.id);

    const result2 = await processTransactionPayout(tx2.id);
    console.log(`  Commission Tier Applied: ${result2.commissionTierApplied}`);
    console.log(`  Platform Commission:     ${result2.platformCommission} GHS`);
    if (result2.commissionTierApplied === "Tier 2" && result2.platformCommission === 12.0) {
      console.log("  \x1b[32m✅ PASS: Correctly applied Tier 2 (12% commission) on 51st transaction.\x1b[0m");
    } else {
      console.error("  \x1b[31m❌ FAIL: Tier 2 commission calculation incorrect.\x1b[0m");
    }

    // Verification 3: Trailing order count = 200 -> Tier 3 (10%)
    console.log("\n- Step A3: Simulating 150 more trailing orders (total 201). Creating 3rd Lab Order...");
    const extraLabOrders = [];
    for (let i = 0; i < 150; i++) {
      extraLabOrders.push({
        doctorId: doctor.id,
        patientId: patient.id,
        laboratoryId: labProfile.id,
        testName: `Lab Test Trailing ${i + 50}`,
        status: "COMPLETED"
      });
    }
    await prisma.labOrder.createMany({ data: extraLabOrders });

    const allLabOrders2 = await prisma.labOrder.findMany({
      where: { laboratoryId: labProfile.id },
      select: { id: true }
    });
    allLabOrders2.forEach(o => {
      if (!createdLabOrderIds.includes(o.id)) createdLabOrderIds.push(o.id);
    });

    const order3 = await prisma.labOrder.create({
      data: {
        doctorId: doctor.id,
        patientId: patient.id,
        laboratoryId: labProfile.id,
        testName: "Lab Test 202",
        status: "ORDERED"
      }
    });
    createdLabOrderIds.push(order3.id);

    const tx3 = await prisma.transaction.create({
      data: {
        userId: labUser.id,
        type: "LAB_ORDER_PAYMENT",
        status: "SUCCESS",
        amount: 100.0,
        amountGHS: 100.0,
        provider: "paystack",
        labOrderId: order3.id
      }
    });
    createdTransactionIds.push(tx3.id);

    const result3 = await processTransactionPayout(tx3.id);
    console.log(`  Commission Tier Applied: ${result3.commissionTierApplied}`);
    console.log(`  Platform Commission:     ${result3.platformCommission} GHS`);
    if (result3.commissionTierApplied === "Tier 3" && result3.platformCommission === 10.0) {
      console.log("  \x1b[32m✅ PASS: Correctly applied Tier 3 (10% commission) on 202nd transaction.\x1b[0m");
    } else {
      console.error("  \x1b[31m❌ FAIL: Tier 3 commission calculation incorrect.\x1b[0m");
    }

    // Verification 4: Audit Trail Persistence (Step 1 transaction hasn't retroactively changed)
    console.log("\n- Step A4: Verifying audit trail persistence (historical 1st transaction)...");
    const historicalTx1 = await prisma.transaction.findUnique({
      where: { id: tx1.id }
    });
    console.log(`  Historical 1st Transaction Applied Tier: ${historicalTx1.commissionTierApplied}`);
    console.log(`  Historical 1st Transaction Commission:   ${historicalTx1.platformCommission} GHS`);
    if (historicalTx1.commissionTierApplied === "Tier 1" && historicalTx1.platformCommission === 15.0) {
      console.log("  \x1b[32m✅ PASS: Audit trail is intact. Retroactive changes did not occur.\x1b[0m");
    } else {
      console.error("  \x1b[31m❌ FAIL: Historical transaction was retroactively modified.\x1b[0m");
    }

    // =========================================================================
    // SECTION B: PHARMACY PARTNER VERIFICATION
    // =========================================================================
    console.log("\n--------------------------------------------------");
    console.log("💊 PART B: PHARMACY COMMISSION TIERS VERIFICATION");
    console.log("--------------------------------------------------");

    // 1. Create a Pharmacy Partner
    const pharmacyUser = await prisma.user.create({
      data: {
        firstName: "Test Pharmacy",
        lastName: "Owner",
        email: `test_pharm_${Date.now()}@company.com`,
        role: "PHARMACY",
        dateOfBirth: new Date(),
        gender: "MALE",
        subscriptionState: "UNSUBSCRIBED"
      }
    });
    createdUserIds.push(pharmacyUser.id);

    const pharmacyProfile = await prisma.pharmacyProfile.create({
      data: {
        userId: pharmacyUser.id,
        displayName: "Test Pharmacy Co",
        verificationStatus: "VERIFIED"
      }
    });
    createdPharmacyProfileIds.push(pharmacyProfile.id);
    console.log(`Created Test Pharmacy Profile ID: ${pharmacyProfile.id}`);

    // Verification 1: trailing order count = 0 -> Tier 1 (15%)
    console.log("\n- Step B1: Trailing order count = 0. Creating 1st Medicine Order...");
    const medOrder1 = await prisma.medicineOrder.create({
      data: {
        orderNumber: `TEST-MED-${Date.now()}-1`,
        patientId: patient.id,
        pharmacyId: pharmacyProfile.id,
        subtotal: 100.0,
        totalAmount: 100.0,
        status: "PENDING"
      }
    });
    createdMedicineOrderIds.push(medOrder1.id);

    const medTx1 = await prisma.transaction.create({
      data: {
        userId: pharmacyUser.id,
        type: "ORDER_PAYMENT",
        status: "SUCCESS",
        amount: 100.0,
        amountGHS: 100.0,
        provider: "paystack",
        orderId: medOrder1.id
      }
    });
    createdTransactionIds.push(medTx1.id);

    const medResult1 = await processTransactionPayout(medTx1.id);
    console.log(`  Commission Tier Applied: ${medResult1.commissionTierApplied}`);
    console.log(`  Platform Commission:     ${medResult1.platformCommission} GHS`);
    if (medResult1.commissionTierApplied === "Tier 1" && medResult1.platformCommission === 15.0) {
      console.log("  \x1b[32m✅ PASS: Correctly applied Tier 1 (15% commission) on 1st pharmacy transaction.\x1b[0m");
    } else {
      console.error("  \x1b[31m❌ FAIL: Pharmacy Tier 1 commission calculation incorrect.\x1b[0m");
    }

    // Verification 2: Trailing order count = 50 -> Tier 2 (12%)
    console.log("\n- Step B2: Simulating 49 more trailing orders (total 50). Creating 2nd Medicine Order...");
    const trailingMedOrders = [];
    for (let i = 0; i < 49; i++) {
      trailingMedOrders.push({
        orderNumber: `TEST-MED-TRAILING-${Date.now()}-${i}`,
        patientId: patient.id,
        pharmacyId: pharmacyProfile.id,
        subtotal: 100.0,
        totalAmount: 100.0,
        status: "DELIVERED"
      });
    }
    await prisma.medicineOrder.createMany({ data: trailingMedOrders });

    const allMedOrders = await prisma.medicineOrder.findMany({
      where: { pharmacyId: pharmacyProfile.id },
      select: { id: true }
    });
    allMedOrders.forEach(o => {
      if (!createdMedicineOrderIds.includes(o.id)) createdMedicineOrderIds.push(o.id);
    });

    const medOrder2 = await prisma.medicineOrder.create({
      data: {
        orderNumber: `TEST-MED-${Date.now()}-51`,
        patientId: patient.id,
        pharmacyId: pharmacyProfile.id,
        subtotal: 100.0,
        totalAmount: 100.0,
        status: "PENDING"
      }
    });
    createdMedicineOrderIds.push(medOrder2.id);

    const medTx2 = await prisma.transaction.create({
      data: {
        userId: pharmacyUser.id,
        type: "ORDER_PAYMENT",
        status: "SUCCESS",
        amount: 100.0,
        amountGHS: 100.0,
        provider: "paystack",
        orderId: medOrder2.id
      }
    });
    createdTransactionIds.push(medTx2.id);

    const medResult2 = await processTransactionPayout(medTx2.id);
    console.log(`  Commission Tier Applied: ${medResult2.commissionTierApplied}`);
    console.log(`  Platform Commission:     ${medResult2.platformCommission} GHS`);
    if (medResult2.commissionTierApplied === "Tier 2" && medResult2.platformCommission === 12.0) {
      console.log("  \x1b[32m✅ PASS: Correctly applied Tier 2 (12% commission) on 51st pharmacy transaction.\x1b[0m");
    } else {
      console.error("  \x1b[31m❌ FAIL: Pharmacy Tier 2 commission calculation incorrect.\x1b[0m");
    }

    // Verification 3: Trailing order count = 200 -> Tier 3 (10%)
    console.log("\n- Step B3: Simulating 150 more trailing orders (total 201). Creating 3rd Medicine Order...");
    const extraMedOrders = [];
    for (let i = 0; i < 150; i++) {
      extraMedOrders.push({
        orderNumber: `TEST-MED-TRAILING-${Date.now()}-${i + 50}`,
        patientId: patient.id,
        pharmacyId: pharmacyProfile.id,
        subtotal: 100.0,
        totalAmount: 100.0,
        status: "DELIVERED"
      });
    }
    await prisma.medicineOrder.createMany({ data: extraMedOrders });

    const allMedOrders2 = await prisma.medicineOrder.findMany({
      where: { pharmacyId: pharmacyProfile.id },
      select: { id: true }
    });
    allMedOrders2.forEach(o => {
      if (!createdMedicineOrderIds.includes(o.id)) createdMedicineOrderIds.push(o.id);
    });

    const medOrder3 = await prisma.medicineOrder.create({
      data: {
        orderNumber: `TEST-MED-${Date.now()}-202`,
        patientId: patient.id,
        pharmacyId: pharmacyProfile.id,
        subtotal: 100.0,
        totalAmount: 100.0,
        status: "PENDING"
      }
    });
    createdMedicineOrderIds.push(medOrder3.id);

    const medTx3 = await prisma.transaction.create({
      data: {
        userId: pharmacyUser.id,
        type: "ORDER_PAYMENT",
        status: "SUCCESS",
        amount: 100.0,
        amountGHS: 100.0,
        provider: "paystack",
        orderId: medOrder3.id
      }
    });
    createdTransactionIds.push(medTx3.id);

    const medResult3 = await processTransactionPayout(medTx3.id);
    console.log(`  Commission Tier Applied: ${medResult3.commissionTierApplied}`);
    console.log(`  Platform Commission:     ${medResult3.platformCommission} GHS`);
    if (medResult3.commissionTierApplied === "Tier 3" && medResult3.platformCommission === 10.0) {
      console.log("  \x1b[32m✅ PASS: Correctly applied Tier 3 (10% commission) on 202nd pharmacy transaction.\x1b[0m");
    } else {
      console.error("  \x1b[31m❌ FAIL: Pharmacy Tier 3 commission calculation incorrect.\x1b[0m");
    }

    // Verification 4: Audit Trail Persistence (Step 1 transaction hasn't retroactively changed)
    console.log("\n- Step B4: Verifying pharmacy audit trail persistence (historical 1st transaction)...");
    const historicalMedTx1 = await prisma.transaction.findUnique({
      where: { id: medTx1.id }
    });
    console.log(`  Historical 1st Transaction Applied Tier: ${historicalMedTx1.commissionTierApplied}`);
    console.log(`  Historical 1st Transaction Commission:   ${historicalMedTx1.platformCommission} GHS`);
    if (historicalMedTx1.commissionTierApplied === "Tier 1" && historicalMedTx1.platformCommission === 15.0) {
      console.log("  \x1b[32m✅ PASS: Pharmacy audit trail is intact. Retroactive changes did not occur.\x1b[0m");
    } else {
      console.error("  \x1b[31m❌ FAIL: Historical pharmacy transaction was retroactively modified.\x1b[0m");
    }

  } catch (error) {
    console.error("❌ Test run failed with critical error:", error);
  } finally {
    console.log("\n🧹 Cleaning up test data...");

    // 1. Delete created Transactions
    if (createdTransactionIds.length > 0) {
      await prisma.transaction.deleteMany({
        where: { id: { in: createdTransactionIds } }
      }).catch(e => console.error("Error cleaning transactions:", e.message));
      console.log(`Deleted ${createdTransactionIds.length} Transactions.`);
    }

    // 2. Delete created LabOrders
    if (createdLabOrderIds.length > 0) {
      await prisma.labOrder.deleteMany({
        where: { id: { in: createdLabOrderIds } }
      }).catch(e => console.error("Error cleaning lab orders:", e.message));
      console.log(`Deleted ${createdLabOrderIds.length} Lab Orders.`);
    }

    // 3. Delete created MedicineOrders
    if (createdMedicineOrderIds.length > 0) {
      await prisma.medicineOrder.deleteMany({
        where: { id: { in: createdMedicineOrderIds } }
      }).catch(e => console.error("Error cleaning medicine orders:", e.message));
      console.log(`Deleted ${createdMedicineOrderIds.length} Medicine Orders.`);
    }

    // 4. Delete created LaboratoryProfile
    if (createdLabProfileIds.length > 0) {
      await prisma.laboratoryProfile.deleteMany({
        where: { id: { in: createdLabProfileIds } }
      }).catch(e => console.error("Error cleaning lab profiles:", e.message));
      console.log(`Deleted ${createdLabProfileIds.length} Laboratory Profiles.`);
    }

    // 5. Delete created PharmacyProfile
    if (createdPharmacyProfileIds.length > 0) {
      await prisma.pharmacyProfile.deleteMany({
        where: { id: { in: createdPharmacyProfileIds } }
      }).catch(e => console.error("Error cleaning pharmacy profiles:", e.message));
      console.log(`Deleted ${createdPharmacyProfileIds.length} Pharmacy Profiles.`);
    }

    // 6. Delete created Users
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } }
      }).catch(e => console.error("Error cleaning users:", e.message));
      console.log(`Deleted ${createdUserIds.length} Users.`);
    }

    console.log("Cleanup finished.");
  }
}

runTests()
  .then(() => prisma.$disconnect())
  .catch(console.error);
