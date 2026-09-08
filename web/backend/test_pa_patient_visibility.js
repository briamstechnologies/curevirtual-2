const prisma = require("./prisma/prismaClient");
const patientRouter = require("./routes/patientRoutes");
const appointmentRouter = require("./routes/appointmentApi");

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

// Find route handlers directly from Express Router stacks
const appointmentsRoute = patientRouter.stack.find(layer => layer.route && layer.route.path === "/appointments").route;
const listHandler = appointmentsRoute.stack[appointmentsRoute.stack.length - 1].handle;

const detailRoute = appointmentRouter.stack.find(layer => layer.route && layer.route.path === "/:id").route;
const detailHandler = detailRoute.stack[detailRoute.stack.length - 1].handle;

async function runTests() {
  console.log("=== Section 7: PA Consult Flow Patient Visibility Verification ===\n");

  const createdUserIds = [];
  const createdDoctorProfileIds = [];
  const createdPatientProfileIds = [];
  const createdAppointmentIds = [];
  const createdTransactionIds = [];
  const createdReviewIds = [];

  try {
    // -------------------------------------------------------------
    // Set Up Base Doctor, PA, and Patient profiles
    // -------------------------------------------------------------
    // Patient
    const patientUser = await prisma.user.create({
      data: {
        firstName: "Jane",
        lastName: "Doe",
        email: `jane.doe.test.${Date.now()}@test.com`,
        role: "PATIENT",
        dateOfBirth: new Date("1990-01-01"),
        gender: "FEMALE"
      }
    });
    createdUserIds.push(patientUser.id);

    const patientProfile = await prisma.patientProfile.create({
      data: {
        userId: patientUser.id,
        bloodGroup: "O_POSITIVE"
      }
    });
    createdPatientProfileIds.push(patientProfile.id);

    // Doctor
    const doctorUser = await prisma.user.create({
      data: {
        firstName: "Dr. Arthur",
        lastName: "Conan",
        email: `dr.arth.test.${Date.now()}@test.com`,
        role: "DOCTOR",
        dateOfBirth: new Date("1975-06-20"),
        gender: "MALE"
      }
    });
    createdUserIds.push(doctorUser.id);

    const doctorProfile = await prisma.doctorProfile.create({
      data: {
        userId: doctorUser.id,
        consultationFee: 150.0,
        licenseNumber: `LIC-DOC-${Date.now()}`,
        specialization: "Family Medicine",
        qualifications: "MD, FACP"
      }
    });
    createdDoctorProfileIds.push(doctorProfile.id);

    // -------------------------------------------------------------
    // SCENARIO 1: Failed/Success retries transaction selection
    // -------------------------------------------------------------
    console.log("--- SCENARIO 1: Multiple Transactions (Failed vs Paid SUCCESS) ---");
    
    // Create Appointment
    const appt1 = await prisma.appointment.create({
      data: {
        doctorId: doctorProfile.id,
        patientId: patientProfile.id,
        appointmentDate: new Date(),
        status: "PENDING"
      }
    });
    createdAppointmentIds.push(appt1.id);

    // Transaction 1: Failed (older)
    const txFailed = await prisma.transaction.create({
      data: {
        userId: patientUser.id,
        type: "CONSULTATION_PAYMENT",
        status: "FAILED",
        appointmentId: appt1.id,
        amount: 150.0,
        amountGHS: 150.0,
        currency: "GHS",
        provider: "PAYSTACK",
        supervisingDoctorId: doctorProfile.id,
        createdAt: new Date(Date.now() - 10 * 60000) // 10 mins ago
      }
    });
    createdTransactionIds.push(txFailed.id);

    // Transaction 2: Success (newer, with review)
    const txSuccess = await prisma.transaction.create({
      data: {
        userId: patientUser.id,
        type: "CONSULTATION_PAYMENT",
        status: "SUCCESS",
        appointmentId: appt1.id,
        amount: 120.0,
        amountGHS: 120.0,
        currency: "GHS",
        provider: "PAYSTACK",
        supervisingDoctorId: doctorProfile.id,
        createdAt: new Date(Date.now() - 5 * 60000) // 5 mins ago
      }
    });
    createdTransactionIds.push(txSuccess.id);

    const review1 = await prisma.paConsultReview.create({
      data: {
        transactionId: txSuccess.id,
        paId: "some-dummy-pa-id",
        supervisingDoctorId: doctorProfile.id,
        reviewStatus: "co_signed"
      }
    });
    createdReviewIds.push(review1.id);

    // Call Patient List API Handler
    const reqList1 = { user: { id: patientUser.id, role: "PATIENT" } };
    const resList1 = mockRes();
    await listHandler(reqList1, resList1);
    
    // Call Appointment Detail API Handler
    const reqDetail1 = {
      user: { id: patientUser.id, role: "PATIENT" },
      params: { id: appt1.id }
    };
    const resDetail1 = mockRes();
    await detailHandler(reqDetail1, resDetail1);

    const apptListResult1 = resList1.jsonPayload.find(a => a.id === appt1.id);
    const apptDetailResult1 = resDetail1.jsonPayload;

    console.log("List Response consultType:", apptListResult1?.consultType);
    console.log("List Response coSignStatus:", apptListResult1?.coSignStatus);
    console.log("Detail Response consultType:", apptDetailResult1?.consultType);
    console.log("Detail Response coSignStatus:", apptDetailResult1?.coSignStatus);

    if (
      apptListResult1?.consultType === "pa" &&
      apptListResult1?.coSignStatus === "co_signed" &&
      apptDetailResult1?.consultType === "pa" &&
      apptDetailResult1?.coSignStatus === "co_signed"
    ) {
      console.log("\x1b[32m✅ PASS: Correctly selected paid transaction over failed retry.\x1b[0m");
    } else {
      console.error("\x1b[31m❌ FAIL: Failed to select the correct PAID transaction.\x1b[0m");
    }

    // -------------------------------------------------------------
    // SCENARIO 2: Plain Doctor Consult (No PA)
    // -------------------------------------------------------------
    console.log("\n--- SCENARIO 2: Plain Doctor Consult ---");
    const appt2 = await prisma.appointment.create({
      data: {
        doctorId: doctorProfile.id,
        patientId: patientProfile.id,
        appointmentDate: new Date(),
        status: "PENDING"
      }
    });
    createdAppointmentIds.push(appt2.id);

    const txDoc = await prisma.transaction.create({
      data: {
        userId: patientUser.id,
        type: "CONSULTATION_PAYMENT",
        status: "SUCCESS",
        appointmentId: appt2.id,
        amount: 150.0,
        amountGHS: 150.0,
        currency: "GHS",
        provider: "PAYSTACK"
      }
    });
    createdTransactionIds.push(txDoc.id);

    const resList2 = mockRes();
    await listHandler(reqList1, resList2);

    const resDetail2 = mockRes();
    await detailHandler({
      user: { id: patientUser.id, role: "PATIENT" },
      params: { id: appt2.id }
    }, resDetail2);

    const apptListResult2 = resList2.jsonPayload.find(a => a.id === appt2.id);
    const apptDetailResult2 = resDetail2.jsonPayload;

    console.log("List Response consultType:", apptListResult2?.consultType);
    console.log("List Response coSignStatus:", apptListResult2?.coSignStatus);
    console.log("Detail Response consultType:", apptDetailResult2?.consultType);
    console.log("Detail Response coSignStatus:", apptDetailResult2?.coSignStatus);

    if (
      apptListResult2?.consultType === "doctor" &&
      apptListResult2?.coSignStatus === null &&
      apptDetailResult2?.consultType === "doctor" &&
      apptDetailResult2?.coSignStatus === null
    ) {
      console.log("\x1b[32m✅ PASS: Plain Doctor Consult correctly resolves to doctor/null.\x1b[0m");
    } else {
      console.error("\x1b[31m❌ FAIL: Incorrect plain Doctor consult resolution.\x1b[0m");
    }

    // -------------------------------------------------------------
    // SCENARIO 3: PA Pending Review (Default Fallback)
    // -------------------------------------------------------------
    console.log("\n--- SCENARIO 3: PA Consult - Pending Review (Fallback) ---");
    const appt3 = await prisma.appointment.create({
      data: {
        doctorId: doctorProfile.id,
        patientId: patientProfile.id,
        appointmentDate: new Date(),
        status: "PENDING"
      }
    });
    createdAppointmentIds.push(appt3.id);

    const txPaPending = await prisma.transaction.create({
      data: {
        userId: patientUser.id,
        type: "CONSULTATION_PAYMENT",
        status: "SUCCESS",
        appointmentId: appt3.id,
        amount: 120.0,
        amountGHS: 120.0,
        currency: "GHS",
        provider: "PAYSTACK",
        supervisingDoctorId: doctorProfile.id
      }
    });
    createdTransactionIds.push(txPaPending.id);

    const resList3 = mockRes();
    await listHandler(reqList1, resList3);

    const resDetail3 = mockRes();
    await detailHandler({
      user: { id: patientUser.id, role: "PATIENT" },
      params: { id: appt3.id }
    }, resDetail3);

    const apptListResult3 = resList3.jsonPayload.find(a => a.id === appt3.id);
    const apptDetailResult3 = resDetail3.jsonPayload;

    console.log("List Response consultType:", apptListResult3?.consultType);
    console.log("List Response coSignStatus:", apptListResult3?.coSignStatus);
    console.log("Detail Response consultType:", apptDetailResult3?.consultType);
    console.log("Detail Response coSignStatus:", apptDetailResult3?.coSignStatus);

    if (
      apptListResult3?.consultType === "pa" &&
      apptListResult3?.coSignStatus === "pending_review" &&
      apptDetailResult3?.consultType === "pa" &&
      apptDetailResult3?.coSignStatus === "pending_review"
    ) {
      console.log("\x1b[32m✅ PASS: PA consult defaults to pending_review when review record is missing.\x1b[0m");
    } else {
      console.error("\x1b[31m❌ FAIL: Failed to default missing review record to pending_review.\x1b[0m");
    }

    // -------------------------------------------------------------
    // SCENARIO 4: PA Co-Signed
    // -------------------------------------------------------------
    console.log("\n--- SCENARIO 4: PA Consult - Co-Signed reviewStatus ---");
    const appt4 = await prisma.appointment.create({
      data: {
        doctorId: doctorProfile.id,
        patientId: patientProfile.id,
        appointmentDate: new Date(),
        status: "PENDING"
      }
    });
    createdAppointmentIds.push(appt4.id);

    const txPaCoSigned = await prisma.transaction.create({
      data: {
        userId: patientUser.id,
        type: "CONSULTATION_PAYMENT",
        status: "SUCCESS",
        appointmentId: appt4.id,
        amount: 120.0,
        amountGHS: 120.0,
        currency: "GHS",
        provider: "PAYSTACK",
        supervisingDoctorId: doctorProfile.id
      }
    });
    createdTransactionIds.push(txPaCoSigned.id);

    const review4 = await prisma.paConsultReview.create({
      data: {
        transactionId: txPaCoSigned.id,
        paId: "some-dummy-pa-id",
        supervisingDoctorId: doctorProfile.id,
        reviewStatus: "co_signed"
      }
    });
    createdReviewIds.push(review4.id);

    const resList4 = mockRes();
    await listHandler(reqList1, resList4);

    const resDetail4 = mockRes();
    await detailHandler({
      user: { id: patientUser.id, role: "PATIENT" },
      params: { id: appt4.id }
    }, resDetail4);

    const apptListResult4 = resList4.jsonPayload.find(a => a.id === appt4.id);
    const apptDetailResult4 = resDetail4.jsonPayload;

    console.log("List Response consultType:", apptListResult4?.consultType);
    console.log("List Response coSignStatus:", apptListResult4?.coSignStatus);
    console.log("Detail Response consultType:", apptDetailResult4?.consultType);
    console.log("Detail Response coSignStatus:", apptDetailResult4?.coSignStatus);

    if (
      apptListResult4?.consultType === "pa" &&
      apptListResult4?.coSignStatus === "co_signed" &&
      apptDetailResult4?.consultType === "pa" &&
      apptDetailResult4?.coSignStatus === "co_signed"
    ) {
      console.log("\x1b[32m✅ PASS: Exposes reviewStatus = co_signed successfully.\x1b[0m");
    } else {
      console.error("\x1b[31m❌ FAIL: Failed to expose reviewStatus = co_signed.\x1b[0m");
    }

  } catch (error) {
    console.error("❌ Test run encountered error:", error);
  } finally {
    console.log("\n🧹 Cleaning up test data...");

    if (createdReviewIds.length > 0) {
      await prisma.paConsultReview.deleteMany({ where: { id: { in: createdReviewIds } } }).catch(e => {});
    }
    if (createdTransactionIds.length > 0) {
      await prisma.transaction.deleteMany({ where: { id: { in: createdTransactionIds } } }).catch(e => {});
    }
    if (createdAppointmentIds.length > 0) {
      await prisma.appointment.deleteMany({ where: { id: { in: createdAppointmentIds } } }).catch(e => {});
    }
    if (createdDoctorProfileIds.length > 0) {
      await prisma.doctorProfile.deleteMany({ where: { id: { in: createdDoctorProfileIds } } }).catch(e => {});
    }
    if (createdPatientProfileIds.length > 0) {
      await prisma.patientProfile.deleteMany({ where: { id: { in: createdPatientProfileIds } } }).catch(e => {});
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
