const prisma = require("./prisma/prismaClient");
const corporateController = require("./controllers/corporate.controller");
const subscriptionController = require("./controllers/subscription.controller");
const { bookConsultation } = require("./controllers/transaction.controller");

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
  console.log("=== Section 6: Corporate Seat-Based Pricing & Benefits Verification ===\n");

  const createdUserIds = [];
  const createdDoctorProfileIds = [];
  const createdPatientProfileIds = [];
  const createdCorporateAccountIds = [];
  const createdCorporateSeatIds = [];
  const createdAppointmentIds = [];
  const createdTransactionIds = [];

  try {
    // -------------------------------------------------------------
    // SCENARIO 1 & 2: ANNUAL BILLING DISCOUNT VERIFICATION
    // -------------------------------------------------------------
    console.log("--- SCENARIO 1 & 2: Annual Billing Discount Verification ---");
    
    // Monthly Corporate Account
    const req1 = {
      body: {
        companyName: `Monthly Corp ${Date.now()}`,
        contactEmail: `monthly_admin_${Date.now()}@corp.com`,
        maxSeats: 10,
        billingCycle: "monthly"
      }
    };
    const res1 = mockRes();
    await corporateController.createAccount(req1, res1);
    const accountMonthly = res1.jsonPayload.account;
    createdCorporateAccountIds.push(accountMonthly.id);
    console.log(`Monthly Account pricePerSeatGHS: ${accountMonthly.pricePerSeatGHS} GHS`);

    // Annual Corporate Account
    const req2 = {
      body: {
        companyName: `Annual Corp ${Date.now()}`,
        contactEmail: `annual_admin_${Date.now()}@corp.com`,
        maxSeats: 10,
        billingCycle: "annual"
      }
    };
    const res2 = mockRes();
    await corporateController.createAccount(req2, res2);
    const accountAnnual = res2.jsonPayload.account;
    createdCorporateAccountIds.push(accountAnnual.id);
    console.log(`Annual Account pricePerSeatGHS: ${accountAnnual.pricePerSeatGHS} GHS`);

    const expectedAnnualPrice = accountMonthly.pricePerSeatGHS * 0.85; // 15% discount
    if (accountAnnual.pricePerSeatGHS === expectedAnnualPrice) {
      console.log("\x1b[32m✅ PASS: Correctly applied 15% annual billing discount.\x1b[0m");
    } else {
      console.error(`\x1b[31m❌ FAIL: Annual discount incorrect. Expected ${expectedAnnualPrice}, got ${accountAnnual.pricePerSeatGHS}\x1b[0m`);
    }

    // -------------------------------------------------------------
    // SCENARIO 3: SEAT ASSIGNMENT & MAX CAPACITY LIMIT
    // -------------------------------------------------------------
    console.log("\n--- SCENARIO 3: Seat Assignment & Max Capacity Limit ---");
    const accountId = accountMonthly.id;

    // Add 5 employees (Limit is 10, but let's test assignment up to max seats limit)
    // Let's create a small account with maxSeats = 5 to test boundary
    const reqSmall = {
      body: {
        companyName: `Small Corp ${Date.now()}`,
        contactEmail: `small_admin_${Date.now()}@corp.com`,
        maxSeats: 5,
        billingCycle: "monthly"
      }
    };
    const resSmall = mockRes();
    await corporateController.createAccount(reqSmall, resSmall);
    const smallAccount = resSmall.jsonPayload.account;
    createdCorporateAccountIds.push(smallAccount.id);

    console.log(`Created corporate account with maxSeats: ${smallAccount.maxSeats}`);

    // Assign 5 seats
    console.log("Assigning 5 employee seats...");
    const assignedSeatIds = [];
    for (let i = 1; i <= 5; i++) {
      const addRes = mockRes();
      await corporateController.addSeat({
        params: { id: smallAccount.id },
        body: { employeeEmail: `employee_${i}_${Date.now()}@corp.com` }
      }, addRes);
      
      if (addRes.statusCode === 201) {
        assignedSeatIds.push(addRes.jsonPayload.seat.id);
        createdCorporateSeatIds.push(addRes.jsonPayload.seat.id);
      }
    }
    console.log(`Successfully assigned ${assignedSeatIds.length} employee seats.`);

    // Try assigning 6th seat (Should fail)
    console.log("Attempting to assign 6th seat (expected to fail)...");
    const addRes6 = mockRes();
    await corporateController.addSeat({
      params: { id: smallAccount.id },
      body: { employeeEmail: `employee_6_${Date.now()}@corp.com` }
    }, addRes6);

    console.log(`Response status: ${addRes6.statusCode}, Message: ${addRes6.jsonPayload.message}`);
    if (addRes6.statusCode === 400 && addRes6.jsonPayload.message.includes("limit reached")) {
      console.log("\x1b[32m✅ PASS: Capacity check successfully rejected the 6th assignment.\x1b[0m");
    } else {
      console.error("\x1b[31m❌ FAIL: Did not enforce the max seats capacity check.\x1b[0m");
    }

    // Revoke one seat
    const seatToRevokeId = assignedSeatIds[0];
    console.log(`Revoking seat ID: ${seatToRevokeId}...`);
    const revokeRes = mockRes();
    await corporateController.removeSeat({
      params: { id: smallAccount.id, seatId: seatToRevokeId }
    }, revokeRes);
    console.log(`Response status: ${revokeRes.statusCode}, Message: ${revokeRes.jsonPayload.message}`);

    // Try assigning a replacement employee (Should now succeed)
    console.log("Attempting to assign replacement employee seat...");
    const replacementRes = mockRes();
    const replacementEmail = `replacement_${Date.now()}@corp.com`;
    await corporateController.addSeat({
      params: { id: smallAccount.id },
      body: { employeeEmail: replacementEmail }
    }, replacementRes);

    if (replacementRes.statusCode === 201) {
      createdCorporateSeatIds.push(replacementRes.jsonPayload.seat.id);
      console.log("\x1b[32m✅ PASS: Replacement successfully assigned after seat revocation.\x1b[0m");
    } else {
      console.error(`\x1b[31m❌ FAIL: Failed to assign replacement employee seat. Status: ${replacementRes.statusCode}\x1b[0m`);
    }

    // -------------------------------------------------------------
    // SCENARIO 4: FAMILY-HEALTH-PLAN BENEFITS VERIFICATION
    // -------------------------------------------------------------
    console.log("\n--- SCENARIO 4: Family-Health-Plan Benefits for Employees ---");

    // Create a new patient user
    const patientEmail = `pat_test_employee_${Date.now()}@corp.com`;
    const patientUser = await prisma.user.create({
      data: {
        firstName: "Pat",
        lastName: "Employee",
        email: patientEmail,
        role: "PATIENT",
        dateOfBirth: new Date("1995-05-15"),
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

    // Fetch eligibility before corporate seat assignment (expected to be false)
    console.log("Checking eligibility before corporate seat assignment...");
    const eligRes1 = mockRes();
    await subscriptionController.checkEligibility({ user: { id: patientUser.id } }, eligRes1);
    console.log(`  isSubscribed: ${eligRes1.jsonPayload.isSubscribed}`);
    if (eligRes1.jsonPayload.isSubscribed === false) {
      console.log("  ✅ Correct: Patient has no benefits initially.");
    } else {
      console.error("  ❌ Incorrect: Patient claims active benefits initially.");
    }

    // Assign employee user email to corporate seat
    console.log(`Assigning Patient User Email (${patientEmail}) to corporate seat...`);
    const seatRes = mockRes();
    await corporateController.addSeat({
      params: { id: accountMonthly.id },
      body: { employeeEmail: patientEmail }
    }, seatRes);
    console.log("  addSeat response status:", seatRes.statusCode, "payload:", seatRes.jsonPayload);
    if (seatRes.statusCode === 201) {
      createdCorporateSeatIds.push(seatRes.jsonPayload.seat.id);
      console.log("  ✅ Seat assigned.");
    }

    // Check eligibility again (expected to be true with Family-Health-Plan benefits)
    console.log("Checking eligibility after corporate seat assignment...");
    const eligRes2 = mockRes();
    await subscriptionController.checkEligibility({ user: { id: patientUser.id } }, eligRes2);
    console.log(`  isSubscribed: ${eligRes2.jsonPayload.isSubscribed}`);
    console.log(`  Source:       ${eligRes2.jsonPayload.source}`);
    console.log(`  Discount %:   ${eligRes2.jsonPayload.perks?.consultationDiscountPct}%`);

    if (
      eligRes2.jsonPayload.isSubscribed === true &&
      eligRes2.jsonPayload.source === "corporate" &&
      eligRes2.jsonPayload.perks?.consultationDiscountPct === 20
    ) {
      console.log("\x1b[32m✅ PASS: Corporate seat holder correctly granted 20% consultation discount benefits.\x1b[0m");
    } else {
      console.error("\x1b[31m❌ FAIL: Failed to grant Family-Health-Plan-equivalent benefits to seat holder.\x1b[0m");
    }

    // -------------------------------------------------------------
    // SCENARIO 5: BOOKING FLOW VALIDATION & MISSING FEE CHECK
    // -------------------------------------------------------------
    console.log("\n--- SCENARIO 5: Booking Flow Fee Validation & Security Checks ---");

    // 1. Create a doctor user
    const doctorUser = await prisma.user.create({
      data: {
        firstName: "Dr",
        lastName: "Test",
        email: `doc_test_${Date.now()}@company.com`,
        role: "DOCTOR",
        dateOfBirth: new Date("1980-01-01"),
        gender: "MALE"
      }
    });
    createdUserIds.push(doctorUser.id);

    // Create doctor profile with NO consultationFee (0 or null)
    const doctorProfileNoFee = await prisma.doctorProfile.create({
      data: {
        userId: doctorUser.id,
        specialization: "GP",
        qualifications: "MD",
        licenseNumber: `LIC-NF-${Date.now()}`,
        consultationFee: 0 // No fee configured
      }
    });
    createdDoctorProfileIds.push(doctorProfileNoFee.id);

    // Create an appointment with this doctor
    const apptNoFee = await prisma.appointment.create({
      data: {
        doctorId: doctorProfileNoFee.id,
        patientId: patientProfile.id,
        appointmentDate: new Date(),
        status: "PENDING"
      }
    });
    createdAppointmentIds.push(apptNoFee.id);

    // Try booking consultation with unconfigured fee doctor (expected to fail)
    console.log("Attempting consultation booking for doctor with no fee configured...");
    const bookRes1 = mockRes();
    await bookConsultation({
      user: { id: patientUser.id },
      body: {
        appointmentId: apptNoFee.id,
        amountGHS: 100.0 // client sends a fake/manipulated fee
      }
    }, bookRes1);

    console.log(`Response status: ${bookRes1.statusCode}, Message: ${bookRes1.jsonPayload?.message}`);
    if (bookRes1.statusCode === 400 && bookRes1.jsonPayload.message.includes("fee not configured")) {
      console.log("\x1b[32m✅ PASS: Enforced consultation fee check; rejected booking.\x1b[0m");
    } else {
      console.error("\x1b[31m❌ FAIL: Trusted client-side amountGHS fallback or didn't reject missing fee.\x1b[0m");
    }

    // Update doctor profile with a valid consultationFee
    console.log("\nConfiguring doctor consultation fee as 150 GHS...");
    const doctorProfileWithFee = await prisma.doctorProfile.update({
      where: { id: doctorProfileNoFee.id },
      data: { consultationFee: 150.0 }
    });

    // Create another appointment
    const apptWithFee = await prisma.appointment.create({
      data: {
        doctorId: doctorProfileWithFee.id,
        patientId: patientProfile.id,
        appointmentDate: new Date(),
        status: "PENDING"
      }
    });
    createdAppointmentIds.push(apptWithFee.id);

    // Verify consultation discount applied on transaction amount
    console.log("Booking consultation for corporate employee (eligible for 20% discount)...");
    const bookRes2 = mockRes();
    await bookConsultation({
      user: { id: patientUser.id },
      body: {
        appointmentId: apptWithFee.id,
        amountGHS: 150.0 // Client request
      }
    }, bookRes2);

    const transaction = bookRes2.jsonPayload.transaction;
    if (transaction) {
      createdTransactionIds.push(transaction.id);
      console.log(`  Expected Base Consult Fee: 150 GHS`);
      console.log(`  Enforced Backend Amount:    ${transaction.amountGHS} GHS`);
      if (transaction.amountGHS === 120.0) { // 20% discount on 150 GHS
        console.log("\x1b[32m✅ PASS: Transaction discount of 20% enforced correctly on the backend.\x1b[0m");
      } else {
        console.error(`\x1b[31m❌ FAIL: Discount not applied. Saved amount is ${transaction.amountGHS}\x1b[0m`);
      }
    } else {
      console.error(`\x1b[31m❌ FAIL: Consultation booking failed. Response:`, bookRes2.jsonPayload);
    }

  } catch (error) {
    console.error("❌ Test run encountered critical error:", error);
  } finally {
    console.log("\n🧹 Cleaning up test data...");

    // Delete created Transactions
    if (createdTransactionIds.length > 0) {
      await prisma.transaction.deleteMany({
        where: { id: { in: createdTransactionIds } }
      }).catch(e => console.error("Error cleaning transactions:", e.message));
      console.log(`Deleted ${createdTransactionIds.length} Transactions.`);
    }

    // Delete created Appointments
    if (createdAppointmentIds.length > 0) {
      await prisma.appointment.deleteMany({
        where: { id: { in: createdAppointmentIds } }
      }).catch(e => console.error("Error cleaning appointments:", e.message));
      console.log(`Deleted ${createdAppointmentIds.length} Appointments.`);
    }

    // Delete created CorporateSeats
    if (createdCorporateSeatIds.length > 0) {
      await prisma.corporateSeat.deleteMany({
        where: { id: { in: createdCorporateSeatIds } }
      }).catch(e => console.error("Error cleaning corporate seats:", e.message));
      console.log(`Deleted ${createdCorporateSeatIds.length} Corporate Seats.`);
    }

    // Delete created CorporateAccounts
    if (createdCorporateAccountIds.length > 0) {
      await prisma.corporateAccount.deleteMany({
        where: { id: { in: createdCorporateAccountIds } }
      }).catch(e => console.error("Error cleaning corporate accounts:", e.message));
      console.log(`Deleted ${createdCorporateAccountIds.length} Corporate Accounts.`);
    }

    // Delete Doctor Profiles
    if (createdDoctorProfileIds.length > 0) {
      await prisma.doctorProfile.deleteMany({
        where: { id: { in: createdDoctorProfileIds } }
      }).catch(e => console.error("Error cleaning doctor profiles:", e.message));
      console.log(`Deleted ${createdDoctorProfileIds.length} Doctor Profiles.`);
    }

    // Delete Patient Profiles
    if (createdPatientProfileIds.length > 0) {
      await prisma.patientProfile.deleteMany({
        where: { id: { in: createdPatientProfileIds } }
      }).catch(e => console.error("Error cleaning patient profiles:", e.message));
      console.log(`Deleted ${createdPatientProfileIds.length} Patient Profiles.`);
    }

    // Delete Users
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
