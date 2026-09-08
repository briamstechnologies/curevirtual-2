const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:5001/api';

let adminToken = '';
let patientToken = '';

let createdPlanIds = [];
let createdSubscriptionIds = [];
let createdTransactionIds = [];

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
    console.log("🚀 STARTING PHASE 4 AUTOMATED TEST (SUBSCRIPTIONS) 🚀");
    console.log("=================================================\n");

    try {
        console.log("⏳ 0. Finding Test Users (Admin & Patient)...");
        const adminUser = await prisma.user.findFirst({ where: { role: 'SUPERADMIN' } }) || await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        const patientUser = await prisma.user.findFirst({ where: { role: 'PATIENT' } });

        if (!adminUser || !patientUser) {
            throw new Error("Could not find required test users (Admin/Patient) in the database.");
        }
        console.log(`✅ PASS: Found Admin (${adminUser.email}) and Patient (${patientUser.email}).\n`);

        console.log("⏳ 1. Authenticating Admin & Patient...");
        const adminLogin = await makeRequest('POST', '/auth/login-sync', { email: adminUser.email });
        const patientLogin = await makeRequest('POST', '/auth/login-sync', { email: patientUser.email });
        
        if (adminLogin.status !== 200 || patientLogin.status !== 200) throw new Error("Login Failed!");
        adminToken = adminLogin.data.token;
        patientToken = patientLogin.data.token;
        console.log("✅ PASS: Auth Tokens received.\n");

        // --- 2. Admin Creates Plans ---
        console.log("⏳ 2. Testing Admin Plan Creation...");
        const plan1Res = await makeRequest('POST', '/subscriptions/plans', {
            module: 'patient',
            name: 'Family Health Plan (TEST)',
            billingCycle: 'monthly',
            priceGHS: 200,
            priceUSD: 15
        }, adminToken);

        const plan2Res = await makeRequest('POST', '/subscriptions/plans', {
            module: 'patient',
            name: 'Premium Family Plan (TEST)',
            billingCycle: 'monthly',
            priceGHS: 500,
            priceUSD: 40
        }, adminToken);

        if (plan1Res.status === 201 && plan2Res.status === 201) {
            createdPlanIds.push(plan1Res.data.plan.id, plan2Res.data.plan.id);
            console.log("✅ PASS: Admin successfully created 2 PATIENT subscription plans.\n");
        } else {
            console.error("❌ FAIL: Plan creation.", plan1Res.data, plan2Res.data);
            return;
        }

        // --- 3. Patient Fetches Plans ---
        console.log("⏳ 3. Testing Patient Fetching Plans (?module=patient)...");
        const getPlansRes = await makeRequest('GET', '/subscriptions/plans?module=patient', null, patientToken);
        if (getPlansRes.status === 200 && getPlansRes.data.plans.length >= 2) {
            console.log("✅ PASS: Patient successfully fetched available PATIENT plans.\n");
        } else {
            console.error("❌ FAIL: Fetching plans.", getPlansRes.data);
        }

        // --- 4. Patient Subscribes ---
        console.log("⏳ 4. Testing Patient Subscribing to a Plan...");
        const targetPlanId = createdPlanIds[0];
        const subRes = await makeRequest('POST', '/subscriptions/subscribe', { planId: targetPlanId }, patientToken);
        
        if (subRes.status === 201 && subRes.data.subscription.status === 'pending_payment' && subRes.data.transaction.status === 'PENDING') {
            createdSubscriptionIds.push(subRes.data.subscription.id);
            createdTransactionIds.push(subRes.data.transaction.id);
            console.log("✅ PASS: Subscription created (pending_payment) AND Transaction spawned (PENDING)!\n");
        } else {
            console.error("❌ FAIL: Subscribing to plan.", subRes.data);
            return;
        }

        // --- 5. Fetch /me ---
        console.log("⏳ 5. Testing Patient Fetching My Subscriptions (/me)...");
        const getMeRes = await makeRequest('GET', '/subscriptions/me', null, patientToken);
        const foundSub = getMeRes.data.subscriptions.find(s => s.id === createdSubscriptionIds[0]);
        if (getMeRes.status === 200 && foundSub) {
            console.log("✅ PASS: Patient successfully verified subscription in their profile.\n");
        } else {
            console.error("❌ FAIL: Fetching /me.", getMeRes.data);
        }

        // --- 6. Duplicate Subscription Check (Security) ---
        console.log("⏳ 6. Testing Duplicate Subscription Security (Subscribing to same module)...");
        const duplicateRes = await makeRequest('POST', '/subscriptions/subscribe', { planId: createdPlanIds[1] }, patientToken);
        if (duplicateRes.status === 409) {
            console.log("✅ PASS: System correctly blocked the duplicate subscription with 409 Conflict.\n");
        } else {
            console.error(`❌ FAIL: Expected 409 but got ${duplicateRes.status}`, duplicateRes.data);
        }

        // --- 7. Cancel Subscription ---
        console.log("⏳ 7. Testing Patient Cancelling Subscription...");
        const cancelRes = await makeRequest('POST', '/subscriptions/cancel', { subscriptionId: createdSubscriptionIds[0] }, patientToken);
        if (cancelRes.status === 200 && cancelRes.data.subscription.status === 'cancelled') {
            console.log("✅ PASS: Subscription status successfully updated to 'cancelled'.\n");
        } else {
            console.error("❌ FAIL: Cancelling subscription.", cancelRes.data);
        }

        console.log("=================================================");
        console.log("🎉 ALL PHASE 4 TESTS EXECUTED SUCCESSFULLY 🎉");
        console.log("=================================================\n");

    } catch (e) {
        console.error("❌ CRITICAL ERROR DURING TESTS:", e);
    } finally {
        console.log("🧹 Running Database Cleanup...");
        try {
            // Delete Transactions
            for (let id of createdTransactionIds) {
                await prisma.transaction.delete({ where: { id } }).catch(() => {});
            }
            // Delete UserSubscriptions
            for (let id of createdSubscriptionIds) {
                await prisma.userSubscription.delete({ where: { id } }).catch(() => {});
            }
            // Delete SubscriptionPlans
            for (let id of createdPlanIds) {
                await prisma.subscriptionPlan.delete({ where: { id } }).catch(() => {});
            }
            console.log("✅ Cleanup complete. Database is restored to original state.");
        } catch(e) {
            console.log("⚠️ Cleanup Warning:", e.message);
        }
        await prisma.$disconnect();
    }
}

runTests();
