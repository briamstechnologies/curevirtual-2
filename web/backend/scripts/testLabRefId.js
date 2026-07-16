const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { ensureDefaultProfile } = require('../lib/provisionProfile');

async function runTest() {
  try {
    console.log('--- Testing Laboratory Reference ID Generation (CV-LB-GH-YYYY-XXXX) ---');

    // Find or create a test Laboratory user
    let user = await prisma.user.findFirst({
      where: { role: 'LABORATORY' }
    });

    if (!user) {
      console.log('No existing LABORATORY user found. Creating a test LABORATORY user...');
      user = await prisma.user.create({
        data: {
          id: 'test-lab-user-' + Date.now(),
          firstName: 'Accra Diagnostic',
          lastName: 'Lab',
          email: `testlab_${Date.now()}@curevirtual.com`,
          role: 'LABORATORY',
        }
      });
    }

    console.log(`Found/Created Lab User: ${user.email} (${user.id})`);

    // Run provisioning with Ghana ('GH')
    const labProfile = await ensureDefaultProfile(user, null, 'GH');

    // Fetch directly using raw SQL to verify physical DB columns
    const rows = await prisma.$queryRawUnsafe(
      `SELECT "id", "userId", "referenceId", "verificationStatus", "country", "laboratoryName", "displayName", "createdAt" FROM "LaboratoryProfile" WHERE "userId" = $1 LIMIT 1`,
      user.id
    );

    console.log('Result Laboratory Profile in DB:', rows[0]);

    if (rows && rows[0] && rows[0].referenceId && rows[0].referenceId.startsWith('CV-LB-GH-2026-')) {
      console.log(`✅ SUCCESS! Laboratory Reference ID generated: ${rows[0].referenceId}`);
    } else {
      console.error('❌ FAILURE: Incorrect or missing Reference ID:', rows?.[0]?.referenceId);
    }
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
