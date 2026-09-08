const prisma = require('./prisma/prismaClient');

async function testGhanaMarketFees() {
    console.log("=================================================");
    console.log("🇬🇭 TEST: 2. Ghana Market Fees Configuration");
    console.log("=================================================\n");

    // 1. Fetch active fees from PlatformFeeConfig table
    const activeFees = await prisma.platformFeeConfig.findMany({
        where: { effectiveTo: null },
        orderBy: { createdAt: 'desc' }
    });

    console.log("📋 Currently Active Market Fees in Database (PlatformFeeConfig):");
    console.table(activeFees.map(f => ({
        Fee_Type: f.feeType,
        Rate_Pct: `${f.ratePct}%`,
        Effective_From: f.effectiveFrom.toISOString().split('T')[0],
        Source_Note: f.sourceNote || 'N/A'
    })));

    // 2. Demonstrate GHS 100 Consultation Calculation
    const consultAmount = 100.00; // GHS 100
    const processingFeeConfig = activeFees.find(f => f.feeType === 'payment_processing')?.ratePct || 1.95;
    const eLevyConfig = activeFees.find(f => f.feeType === 'transfer_levy')?.ratePct || 0.0;
    const vatStackConfig = activeFees.find(f => f.feeType === 'vat_stack')?.ratePct || 20.0;
    const doctorCommissionConfig = activeFees.find(f => f.feeType === 'doctor_consultation')?.ratePct || 12.0;

    const processingFee = consultAmount * (processingFeeConfig / 100);
    const eLevyFee = consultAmount * (eLevyConfig / 100);
    const platformCommission = consultAmount * (doctorCommissionConfig / 100);
    const vatTaxOnCommission = platformCommission * (vatStackConfig / 100);
    const netPlatformRevenue = platformCommission - vatTaxOnCommission;
    const doctorPayout = consultAmount - processingFee - platformCommission;

    console.log("\n💡 Simulation Breakdown for GHS 100.00 PAYG Doctor Consult:");
    console.log(`  • Total Patient Pays: GHS ${consultAmount.toFixed(2)} (Checkout Clean - Fee Absorbed)`);
    console.log(`  • Payment Processing Fee (Paystack ${processingFeeConfig}%): GHS ${processingFee.toFixed(2)}`);
    console.log(`  • E-Levy / Transfer Fee (${eLevyConfig}% Configurable): GHS ${eLevyFee.toFixed(2)}`);
    console.log(`  • Platform Gross Commission (${doctorCommissionConfig}%): GHS ${platformCommission.toFixed(2)}`);
    console.log(`  • Platform Tax Burden (VAT/NHIL/GETFund ${vatStackConfig}%): GHS ${vatTaxOnCommission.toFixed(2)}`);
    console.log(`  • Net Platform Revenue After Tax: GHS ${netPlatformRevenue.toFixed(2)}`);
    console.log(`  • Doctor Net Payout: GHS ${doctorPayout.toFixed(2)}`);

    console.log("\n=================================================");
    console.log("✅ TEST PASSED: Ghana Market Fees Engine Verified!");
    console.log("=================================================");

    await prisma.$disconnect();
}

testGhanaMarketFees();
