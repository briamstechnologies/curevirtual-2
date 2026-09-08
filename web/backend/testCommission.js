const prisma = require('./prisma/prismaClient');
const { processTransactionPayout } = require('./services/commissionService');

async function testCommission() {
    try {
        console.log("🔍 Finding a real user and appointment from the database...");
        
        // Find any user for the Transaction.userId foreign key
        const user = await prisma.user.findFirst();
        if (!user) {
            console.log("❌ No users found in the database. Cannot create transaction.");
            return;
        }

        const appointment = await prisma.appointment.findFirst();

        if (!appointment) {
            console.log("❌ No appointments found in the database to run the test.");
            return;
        }

        console.log(`✅ Found Appointment ID: ${appointment.id}`);
        console.log(`   Doctor Profile ID: ${appointment.doctorId}`);
        
        console.log("\n🛠️ Creating a dummy Transaction of 100 GHS for this appointment...");
        const dummyTransaction = await prisma.transaction.create({
            data: {
                userId: user.id,
                type: "CONSULTATION_PAYMENT",
                status: "PENDING", 
                appointmentId: appointment.id,
                amount: 100, // old field required by schema
                amountGHS: 100,
                provider: "PAYSTACK"
            }
        });

        console.log(`✅ Dummy Transaction created with ID: ${dummyTransaction.id}`);
        
        console.log("\n⚙️ Running processTransactionPayout()...");
        const result = await processTransactionPayout(dummyTransaction.id);
        
        console.log("\n=================================================");
        console.log("🎉 TEST RESULT (EXPECTED VS ACTUAL)");
        console.log("=================================================");
        console.log(`Gross Amount Paid (amountGHS): 100 GHS`);
        console.log("-------------------------------------------------");
        console.log(`Expected Payment Processing (1.95%): 1.95 GHS`);
        console.log(`Actual Payment Processing:           ${result.paymentProcessingFee} GHS`);
        console.log("-------------------------------------------------");
        console.log(`Expected Platform Commission (12%):  12 GHS  (Or 8 GHS if doctor is subscribed)`);
        console.log(`Actual Platform Commission:          ${result.platformCommission} GHS`);
        console.log("-------------------------------------------------");
        console.log(`Expected Provider Payout (86.05%):   86.05 GHS (Or 90.05 GHS if subscribed)`);
        console.log(`Actual Provider Payout:              ${result.providerPayout} GHS`);
        console.log("=================================================");
        
        // Cleanup the dummy transaction so we don't pollute your database
        console.log("\n🧹 Cleaning up dummy transaction...");
        await prisma.transaction.delete({ where: { id: dummyTransaction.id } });
        console.log("✅ Cleanup complete.");

    } catch (error) {
        console.error("❌ Test failed with error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

testCommission();
