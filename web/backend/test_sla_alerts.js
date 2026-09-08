const prisma = require("./prisma/prismaClient");
const paReviewController = require("./controllers/paReview.controller");

// Mock Express response helper
function mockResponse() {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.jsonData = data;
    return res;
  };
  return res;
}

async function runTests() {
  console.log("=== Running Compliance SLA Compliance Alerts Verification ===\n");

  let testTransactionId = null;
  let testReviewId = null;
  const createdNotificationIds = [];

  try {
    // 1. Fetch dependencies
    const docProfile = await prisma.doctorProfile.findFirst({ select: { id: true, userId: true } });
    if (!docProfile) {
      throw new Error("No doctor profile found in database to run SLA alert tests.");
    }
    console.log(`Found Supervising Doctor Profile ID: ${docProfile.id}, User ID: ${docProfile.userId}`);

    const patientUser = await prisma.user.findFirst({ select: { id: true } });
    if (!patientUser) {
      throw new Error("No patient/user found in database to link transaction.");
    }

    const admins = await prisma.user.findMany({
      where: { role: { in: ['SUPERADMIN', 'ADMIN'] } },
      select: { id: true, email: true, role: true }
    });
    console.log(`Found ${admins.length} platform admin users in the database.`);
    if (admins.length === 0) {
      throw new Error("No SUPERADMIN or ADMIN users found in the database. Test cannot proceed.");
    }

    // 2. Create an overdue review (> 24 hours ago)
    const overdueTime = new Date();
    overdueTime.setHours(overdueTime.getHours() - 25);

    // Create a dummy transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId: patientUser.id,
        type: "APPOINTMENT_PAYMENT",
        status: "SUCCESS",
        amount: 100.0,
        provider: "stripe",
        createdAt: overdueTime
      }
    });
    testTransactionId = transaction.id;

    // Create the PaConsultReview created 25 hours ago
    const review = await prisma.paConsultReview.create({
      data: {
        transactionId: testTransactionId,
        paId: "dummy-pa-id",
        supervisingDoctorId: docProfile.id,
        consultNotes: "Automated test notes for SLA overdue",
        reviewStatus: "pending_review",
        createdAt: overdueTime,
        updatedAt: overdueTime
      }
    });
    testReviewId = review.id;
    console.log(`Created overdue PaConsultReview ID: ${testReviewId} (created at ${overdueTime.toISOString()})`);

    // 3. Trigger the checkSLAOverdueReviews controller function
    console.log("\nTriggering SLA check controller...");
    const req = {};
    const res = mockResponse();
    await paReviewController.checkSLAOverdueReviews(req, res);

    console.log("Controller Status Code:", res.statusCode);
    console.log("Controller Response overdueCount:", res.jsonData?.overdueCount);
    console.log("Controller Response alertsTriggered:", res.jsonData?.alertsTriggered);

    // 4. Verify Notifications in database
    console.log("\nVerifying Notifications...");

    // Verify doctor notification
    const docNotif = await prisma.notification.findFirst({
      where: {
        userId: docProfile.userId,
        type: 'SYSTEM',
        actionData: { contains: testReviewId }
      }
    });

    if (docNotif) {
      console.log(`\x1b[32m✅ PASS: Doctor (User ID: ${docProfile.userId}) received SLA alert: "${docNotif.title}"\x1b[0m`);
      createdNotificationIds.push(docNotif.id);
    } else {
      console.error(`\x1b[31m❌ FAIL: Supervising doctor did NOT receive SLA overdue alert.\x1b[0m`);
    }

    // Verify admin notifications
    let adminNotifSuccess = true;
    for (const admin of admins) {
      const adminNotif = await prisma.notification.findFirst({
        where: {
          userId: admin.id,
          type: 'SYSTEM',
          actionData: { contains: testReviewId }
        }
      });

      if (adminNotif) {
        console.log(`\x1b[32m✅ PASS: Admin (${admin.email}, Role: ${admin.role}) received SLA alert: "${adminNotif.title}"\x1b[0m`);
        createdNotificationIds.push(adminNotif.id);
      } else {
        console.error(`\x1b[31m❌ FAIL: Admin (${admin.email}, Role: ${admin.role}) did NOT receive SLA overdue alert.\x1b[0m`);
        adminNotifSuccess = false;
      }
    }

    if (docNotif && adminNotifSuccess) {
      console.log("\n\x1b[32m🎉 ALL COMPLIANCE SLA ALERT TESTS PASSED SUCCESSFULLY! 🎉\x1b[0m");
    } else {
      console.error("\n\x1b[31m❌ SLA ALERT VERIFICATION FAILED.\x1b[0m");
    }

  } catch (error) {
    console.error("❌ Error running test:", error);
  } finally {
    console.log("\n🧹 Cleaning up test data...");
    
    if (createdNotificationIds.length > 0) {
      await prisma.notification.deleteMany({
        where: { id: { in: createdNotificationIds } }
      });
      console.log(`Deleted ${createdNotificationIds.length} compliance notifications.`);
    }

    if (testReviewId) {
      await prisma.paConsultReview.delete({
        where: { id: testReviewId }
      });
      console.log("Deleted PaConsultReview.");
    }

    if (testTransactionId) {
      await prisma.transaction.delete({
        where: { id: testTransactionId }
      });
      console.log("Deleted Transaction.");
    }

    console.log("Cleanup finished.");
  }
}

runTests()
  .then(() => prisma.$disconnect())
  .catch(console.error);
