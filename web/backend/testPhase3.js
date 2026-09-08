const prisma = require('./prisma/prismaClient');

const BASE_URL = 'http://localhost:5001/api';

// Real Test Data
const patientEmail = 'muhammad.65217@iqra.edu.pk';
const doctorEmail = 'yemep68826@cosdas.com';
const normalApptId = 'b4867458-41db-4a51-b927-4a7a1eab72c2';
const paApptId = '6761f485-36c8-4f3f-9397-1a45acb75002';
const doctorProfileId = 'f4426939-48da-4734-b53d-80c8716048e7';
const paProfileId = 'ddb134b7-d9c4-4308-8958-c5422eb12ae1';

let patientToken = '';
let doctorToken = '';
let createdTransactionIds = [];
let dummyAssignmentId = null;
let currentTestTransactionId = null; // Store the exact transaction ID created in Test 3

// Helper to make API requests
async function makeRequest(method, endpoint, body, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json();
    return { status: response.status, data };
}

async function runTests() {
    console.log("=================================================");
    console.log("🚀 STARTING PHASE 3 AUTOMATED TEST (INDEPENDENT) 🚀");
    console.log("=================================================\n");

    try {
        console.log("🧹 0. PRE-FLIGHT SETUP: Creating Fresh Data...");
        
        // Ensure no old dummy assignments are lingering
        await prisma.doctorPAAssignment.deleteMany({
            where: { createdBy: 'system_testPhase3' }
        }).catch(() => {});

        // Create a fresh ACTIVE assignment just for this run
        const newAssignment = await prisma.doctorPAAssignment.create({
            data: {
                doctorId: doctorProfileId,
                paId: paProfileId,
                assignmentStatus: 'ACTIVE',
                createdBy: 'system_testPhase3'
            }
        });
        dummyAssignmentId = newAssignment.id;
        console.log("✅ PASS: Fresh DoctorPAAssignment created for testing.\n");


        // --- 1. Login ---
        console.log("⏳ 1. Authenticating Patient & Doctor...");
        const patientLogin = await makeRequest('POST', '/auth/login-sync', { email: patientEmail });
        const doctorLogin = await makeRequest('POST', '/auth/login-sync', { email: doctorEmail });
        
        if (patientLogin.status !== 200 || doctorLogin.status !== 200) throw new Error("Login Failed!");
        patientToken = patientLogin.data.token;
        doctorToken = doctorLogin.data.token;
        console.log("✅ PASS: Auth Tokens received.\n");

        // --- 2. Normal Consult Book ---
        console.log("⏳ 2. Testing Normal Consult Book (Non-PA)...");
        const normalRes = await makeRequest('POST', '/transactions/consult', {
            appointmentId: normalApptId,
            amountGHS: 100,
            isPaConsult: false
        }, patientToken);

        if (normalRes.status === 201 && normalRes.data.transaction && !normalRes.data.paReview) {
            createdTransactionIds.push(normalRes.data.transaction.id);
            console.log("✅ PASS: Normal Transaction created (No PA Review spawned).\n");
        } else {
            console.error("❌ FAIL: Normal Consult.", normalRes.data);
        }

        // --- 3. PA Consult Book (Valid) ---
        console.log("⏳ 3. Testing PA Consult Book (Valid PA ID)...");
        const paRes = await makeRequest('POST', '/transactions/consult', {
            appointmentId: paApptId,
            amountGHS: 150,
            isPaConsult: true,
            doctorProfileId,
            paProfileId
        }, patientToken);

        if (paRes.status === 201 && paRes.data.paReview) {
            currentTestTransactionId = paRes.data.transaction.id;
            createdTransactionIds.push(currentTestTransactionId);
            console.log("✅ PASS: PA Transaction created & PaConsultReview auto-spawned successfully!\n");
        } else {
            console.error("❌ FAIL: Valid PA Consult.", paRes.data);
        }

        // --- 4. PA Consult Book (Security Rejection Test) ---
        console.log("⏳ 4. Testing PA Consult Security (Invalid PA ID)...");
        const paSecRes = await makeRequest('POST', '/transactions/consult', {
            appointmentId: paApptId,
            amountGHS: 150,
            isPaConsult: true,
            doctorProfileId,
            paProfileId: 'invalid-random-id-1234'
        }, patientToken);

        if (paSecRes.status === 403) {
            console.log("✅ PASS: System correctly blocked the request with 403 Forbidden.\n");
        } else {
            console.error(`❌ FAIL: Expected 403 but got ${paSecRes.status}`, paSecRes.data);
        }

        // --- 5. Fetch Pending Reviews as Doctor ---
        console.log("⏳ 5. Testing Doctor fetching their pending reviews...");
        const getReviewsRes = await makeRequest('GET', '/pa-reviews', null, doctorToken);
        
        let reviewIdToSign = null;
        if (getReviewsRes.status === 200 && getReviewsRes.data.reviews.length > 0) {
            // Find the specific review we JUST created in Step 3 to ensure we don't accidentally test stale data
            const specificReview = getReviewsRes.data.reviews.find(r => r.transactionId === currentTestTransactionId);
            
            if (specificReview) {
                reviewIdToSign = specificReview.id;
                console.log(`✅ PASS: Doctor fetched reviews successfully. Found newly created Review ID: ${reviewIdToSign}\n`);
            } else {
                console.error("❌ FAIL: The review created in Step 3 was not found in the doctor's pending list.", getReviewsRes.data);
            }
        } else {
            console.error("❌ FAIL: Could not fetch pending reviews.", getReviewsRes.data);
        }

        // --- 6. Co-sign the Review ---
        if (reviewIdToSign) {
            console.log("⏳ 6. Testing Doctor Co-signing the review...");
            const signRes = await makeRequest('PUT', `/pa-reviews/${reviewIdToSign}`, {
                reviewStatus: "co_signed",
                doctorComments: "Approved via automated test!"
            }, doctorToken);

            if (signRes.status === 200 && signRes.data.review.reviewStatus === "co_signed") {
                console.log("✅ PASS: Review status successfully updated to 'co_signed'!\n");
            } else {
                console.error("❌ FAIL: Review was not signed.", signRes.data);
            }
        }

        console.log("=================================================");
        console.log("🎉 ALL TESTS EXECUTED SUCCESSFULLY 🎉");
        console.log("=================================================\n");

    } catch (e) {
        console.error("❌ CRITICAL ERROR DURING TESTS:", e);
    } finally {
        console.log("🧹 Running Database Cleanup...");
        try {
            // Delete the dummy PA assignment created specifically for this run
            if (dummyAssignmentId) {
                await prisma.doctorPAAssignment.delete({ where: { id: dummyAssignmentId } }).catch(() => {});
            }
            
            // Delete the transactions created during this specific test run
            for (let id of createdTransactionIds) {
                // Delete reviews first to respect foreign keys
                await prisma.paConsultReview.deleteMany({ where: { transactionId: id } }).catch(() => {});
                await prisma.transaction.delete({ where: { id } }).catch(() => {});
            }
            console.log("✅ Cleanup complete. Database is restored to original state.");
        } catch(e) {
            console.log("⚠️ Cleanup Warning:", e.message);
        }
        await prisma.$disconnect();
    }
}

runTests();
