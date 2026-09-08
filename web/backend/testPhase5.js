require('dotenv').config();
const crypto = require("crypto");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:5001/api';

let adminToken = '';
let patientToken = '';

let createdTxId = '';
let createdSubId = '';
let createdPlanId = '';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "sk_test_097b34807aa76633c5e70575c5a0a5403d71a920";

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
    console.log("🚀 STARTING PHASE 5 AUTOMATED TEST (PAYMENTS) 🚀");
    console.log("=================================================\n");

    try {
        console.log("⏳ 0. Finding Test Users (Admin & Patient)...");
        const adminUser = await prisma.user.findFirst({ where: { role: 'SUPERADMIN' } }) || await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        const patientUser = await prisma.user.findFirst({ where: { role: 'PATIENT' } });

        if (!adminUser || !patientUser) {
            throw new Error("Could not find required test users.");
        }
        
        console.log("⏳ 1. Authenticating...");
        const adminLogin = await makeRequest('POST', '/auth/login-sync', { email: adminUser.email });
        const patientLogin = await makeRequest('POST', '/auth/login-sync', { email: patientUser.email });
        adminToken = adminLogin.data.token;
        patientToken = patientLogin.data.token;

        // Create a dummy subscription plan and subscription for testing the webhook
        const plan = await prisma.subscriptionPlan.create({
            data: { module: 'patient', name: 'Phase 5 Test Plan', billingCycle: 'monthly', priceGHS: 100, priceUSD: 10, isActive: true }
        });
        createdPlanId = plan.id;

        const sub = await prisma.userSubscription.create({
            data: { userId: patientUser.id, planId: plan.id, status: 'pending_payment', autoRenew: true }
        });
        createdSubId = sub.id;

        const tx = await prisma.transaction.create({
            data: {
                type: "SUBSCRIPTION_PAYMENT",
                amount: plan.priceGHS,
                amountGHS: plan.priceGHS,
                provider: "PENDING_GATEWAY",
                status: "PENDING",
                userId: patientUser.id,
                metadata: JSON.stringify({ subscriptionId: sub.id })
            }
        });
        createdTxId = tx.id;
        console.log(`✅ Setup complete. Created Pending Transaction: ${tx.id}\n`);

        // --- 2. Test Payment Initiation ---
        console.log("⏳ 2. Testing Payment Initiation (POST /api/payments/v2/initiate)...");
        const initRes = await makeRequest('POST', '/payments/v2/initiate', { transactionId: tx.id }, patientToken);
        if (initRes.status === 200 && initRes.data.authorization_url) {
            console.log("✅ PASS: Successfully generated Paystack Authorization URL:", initRes.data.authorization_url, "\n");
        } else {
            console.error("❌ FAIL: Payment Initiation failed.", initRes.data);
            return;
        }

        // --- 3. Test Webhook Security (Invalid Signature) ---
        console.log("⏳ 3. Testing Webhook Security (Invalid Signature)...");
        const fakePayload = { event: "charge.success", data: { reference: "fake_ref", metadata: { transactionId: tx.id } } };
        
        const invalidWebhookRes = await fetch(`${BASE_URL}/payments/v2/webhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-paystack-signature': 'this-is-a-fake-signature'
            },
            body: JSON.stringify(fakePayload)
        });
        if (invalidWebhookRes.status === 401) {
            console.log("✅ PASS: Webhook correctly rejected invalid signature with 401 Unauthorized.\n");
        } else {
            console.error(`❌ FAIL: Expected 401 but got ${invalidWebhookRes.status}`);
            return;
        }

        // --- 4. Test Valid Webhook (charge.success) ---
        console.log("⏳ 4. Testing Valid Webhook Processing...");
        const validPayload = { 
            event: "charge.success", 
            data: { 
                reference: "ref_" + Date.now() + "_" + Math.random().toString(36).substring(7), 
                metadata: { transactionId: tx.id } 
            } 
        };
        const payloadStr = JSON.stringify(validPayload);
        const validHash = crypto.createHmac("sha512", PAYSTACK_SECRET_KEY).update(payloadStr).digest("hex");
        
        const validWebhookRes = await fetch(`${BASE_URL}/payments/v2/webhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-paystack-signature': validHash
            },
            body: payloadStr
        });

        if (validWebhookRes.status === 200) {
            console.log("✅ PASS: Webhook processed successfully.");
            
            // Verify DB changes
            const updatedTx = await prisma.transaction.findUnique({ where: { id: tx.id } });
            const updatedSub = await prisma.userSubscription.findUnique({ where: { id: sub.id } });
            
            if (updatedTx.status === "SUCCESS" && updatedSub.status === "active") {
                console.log("✅ PASS: Transaction status is SUCCESS and Subscription is ACTIVE.\n");
            } else {
                console.error("❌ FAIL: DB not updated properly.", { txStatus: updatedTx.status, subStatus: updatedSub.status });
                return;
            }
        } else {
            const errData = await validWebhookRes.json().catch(() => null);
            console.error(`❌ FAIL: Expected 200 but got ${validWebhookRes.status}`, errData);
            return;
        }

        // --- 5. Test Webhook Idempotency ---
        console.log("⏳ 5. Testing Webhook Idempotency (Duplicate delivery)...");
        const duplicateWebhookRes = await fetch(`${BASE_URL}/payments/v2/webhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-paystack-signature': validHash
            },
            body: payloadStr
        });
        
        if (duplicateWebhookRes.status === 200) {
            console.log("✅ PASS: Idempotency correctly handled (Returned 200 without erroring out).\n");
        } else {
            console.error("❌ FAIL: Idempotency failed.");
        }

        console.log("=================================================");
        console.log("🎉 ALL PHASE 5 TESTS EXECUTED SUCCESSFULLY 🎉");
        console.log("=================================================\n");

    } catch (e) {
        console.error("❌ CRITICAL ERROR DURING TESTS:", e);
    } finally {
        console.log("🧹 Running Database Cleanup...");
        try {
            await prisma.transaction.delete({ where: { id: createdTxId } }).catch(()=>{});
            await prisma.userSubscription.delete({ where: { id: createdSubId } }).catch(()=>{});
            await prisma.subscriptionPlan.delete({ where: { id: createdPlanId } }).catch(()=>{});
            console.log("✅ Cleanup complete.");
        } catch(e) {}
        await prisma.$disconnect();
    }
}

runTests();
