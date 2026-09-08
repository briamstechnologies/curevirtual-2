require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:5001/api';

let adminToken = '';
let createdAccountId = '';

// Helper to make API requests
async function makeRequest(method, endpoint, body, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json().catch(() => null);
    return { status: response.status, data };
}

async function runTests() {
    console.log("=================================================");
    console.log("🚀 STARTING PHASE 6 AUTOMATED TEST (CORPORATE SEATS) 🚀");
    console.log("=================================================\n");

    try {
        console.log("⏳ 0. Finding Admin User & Authenticating...");
        const adminUser = await prisma.user.findFirst({ where: { role: 'SUPERADMIN' } }) || await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        if (!adminUser) throw new Error("Could not find Admin user in database.");

        const adminLogin = await makeRequest('POST', '/auth/login-sync', { email: adminUser.email });
        if (adminLogin.status !== 200) throw new Error("Admin login failed.");
        adminToken = adminLogin.data.token;
        console.log(`✅ PASS: Found Admin (${adminUser.email}) and authenticated.\n`);

        // --- STEP 1: Minimum Seats Rule Validation ---
        console.log("⏳ 1. Testing Minimum 5 Seats Rule (maxSeats: 3)...");
        const invalidAccRes = await makeRequest('POST', '/corporate/accounts', {
            companyName: "Too Small Corp",
            contactEmail: `invalid_${Date.now()}@corp.com`,
            maxSeats: 3
        }, adminToken);

        if (invalidAccRes.status === 400 && invalidAccRes.data.message.includes("Minimum 5 seats required")) {
            console.log("✅ PASS: Correctly rejected corporate creation with maxSeats < 5.\n");
        } else {
            console.error(`❌ FAIL: Expected 400 but got ${invalidAccRes.status}`, invalidAccRes.data);
            return;
        }

        // --- STEP 2: Valid Account Creation ---
        console.log("⏳ 2. Testing Valid Corporate Account Creation (maxSeats: 5)...");
        const validAccRes = await makeRequest('POST', '/corporate/accounts', {
            companyName: "Acme Health Ghana",
            contactEmail: `acme_${Date.now()}@health.com`,
            maxSeats: 5,
            pricePerSeatGHS: 60.0,
            billingCycle: "monthly"
        }, adminToken);

        if (validAccRes.status === 201 && validAccRes.data.account.activeEmployees === 0) {
            createdAccountId = validAccRes.data.account.id;
            console.log(`✅ PASS: Corporate Account created (ID: ${createdAccountId}, maxSeats: 5, activeEmployees: 0).\n`);
        } else {
            console.error("❌ FAIL: Corporate Account creation failed.", validAccRes.data);
            return;
        }

        // --- STEP 3: Add Seats & Counter Increment ---
        console.log("⏳ 3. Testing Adding Employee Seats & Counter Increment...");
        let addedSeatIds = [];
        const emp1Email = `employee_1_${Date.now()}@acme.com`;
        
        const seat1Res = await makeRequest('POST', `/corporate/accounts/${createdAccountId}/seats`, { employeeEmail: emp1Email }, adminToken);
        if (seat1Res.status === 201) {
            addedSeatIds.push({ id: seat1Res.data.seat.id, email: emp1Email });
        } else {
            console.error("❌ FAIL: Adding seat 1 failed.", seat1Res.data);
            return;
        }

        const accountAfter1 = await makeRequest('GET', `/corporate/accounts/${createdAccountId}`, null, adminToken);
        if (accountAfter1.data.account.activeEmployees === 1) {
            console.log("✅ PASS: First seat added and activeEmployees counter updated to 1.\n");
        } else {
            console.error(`❌ FAIL: Counter expected 1 but got ${accountAfter1.data.account.activeEmployees}`);
            return;
        }

        // --- STEP 4: Duplicate Seat Check (Tested BEFORE Capacity Full) ---
        console.log("⏳ 4. Testing Duplicate Seat Security Check (Re-adding employee_1)...");
        const duplicateRes = await makeRequest('POST', `/corporate/accounts/${createdAccountId}/seats`, { 
            employeeEmail: emp1Email 
        }, adminToken);

        if (duplicateRes.status === 409) {
            console.log("✅ PASS: System correctly blocked duplicate employee email with 409 Conflict.\n");
        } else {
            console.error(`❌ FAIL: Expected 409 Conflict but got ${duplicateRes.status}`, duplicateRes.data);
            return;
        }

        // --- STEP 5: Fill remaining seats up to maxSeats (5) ---
        console.log("⏳ 5. Filling remaining seats up to maxSeats (5)...");
        for (let i = 2; i <= 5; i++) {
            const email = `employee_${i}_${Date.now()}@acme.com`;
            const seatRes = await makeRequest('POST', `/corporate/accounts/${createdAccountId}/seats`, { employeeEmail: email }, adminToken);
            if (seatRes.status === 201) {
                addedSeatIds.push({ id: seatRes.data.seat.id, email });
            } else {
                console.error(`❌ FAIL: Adding seat ${i} failed.`, seatRes.data);
                return;
            }
        }

        const accountAfter5 = await makeRequest('GET', `/corporate/accounts/${createdAccountId}`, null, adminToken);
        if (accountAfter5.data.account.activeEmployees === 5) {
            console.log("✅ PASS: All 5 Seats added, activeEmployees counter is 5.\n");
        } else {
            console.error(`❌ FAIL: Counter expected 5 but got ${accountAfter5.data.account.activeEmployees}`);
            return;
        }

        // --- STEP 6: Capacity Limit Check ---
        console.log("⏳ 6. Testing Capacity Limit Check (Adding 6th seat when maxSeats: 5)...");
        const overflowRes = await makeRequest('POST', `/corporate/accounts/${createdAccountId}/seats`, { 
            employeeEmail: `employee_6_${Date.now()}@acme.com` 
        }, adminToken);

        if (overflowRes.status === 400 && overflowRes.data.message.includes("limit reached")) {
            console.log("✅ PASS: System correctly blocked 6th seat addition with 400 Bad Request.\n");
        } else {
            console.error(`❌ FAIL: Expected 400 Capacity Limit Error but got ${overflowRes.status}`, overflowRes.data);
            return;
        }

        // --- STEP 7: Remove Seat & Decrement Counter ---
        console.log("⏳ 7. Testing Seat Removal & Counter Decrement...");
        const seatToRemove = addedSeatIds.pop();
        const removeRes = await makeRequest('DELETE', `/corporate/accounts/${createdAccountId}/seats/${seatToRemove.id}`, null, adminToken);

        if (removeRes.status === 200) {
            const accountAfterDelete = await makeRequest('GET', `/corporate/accounts/${createdAccountId}`, null, adminToken);
            if (accountAfterDelete.data.account.activeEmployees === 4) {
                console.log("✅ PASS: Seat removed successfully and activeEmployees counter decremented to 4.\n");
            } else {
                console.error(`❌ FAIL: Counter expected 4 but got ${accountAfterDelete.data.account.activeEmployees}`);
                return;
            }
        } else {
            console.error("❌ FAIL: Seat removal failed.", removeRes.data);
            return;
        }

        console.log("=================================================");
        console.log("🎉 ALL PHASE 6 TESTS EXECUTED SUCCESSFULLY 🎉");
        console.log("=================================================\n");

    } catch (e) {
        console.error("❌ CRITICAL ERROR DURING PHASE 6 TESTS:", e);
    } finally {
        if (createdAccountId) {
            console.log("🧹 Running Database Cleanup...");
            await prisma.corporateAccount.delete({ where: { id: createdAccountId } }).catch(() => {});
            console.log("✅ Cleanup complete.");
        }
        await prisma.$disconnect();
    }
}

runTests();
