const prisma = require('../prisma/prismaClient');
const { ensureDefaultProfile } = require('../lib/provisionProfile');

async function main() {
  console.log('--- Testing Doctor Reference ID Generation (CV-DR-GH-YYYY-XXXX) ---');

  // Find or create a test doctor user
  let user = await prisma.user.findFirst({
    where: { role: 'DOCTOR' }
  });

  if (!user) {
    console.log('No doctor user found. Testing provision with dummy user id...');
    return;
  }

  console.log(`Found Doctor User: ${user.email} (${user.id})`);

  // Run provision Profile
  const profile = await ensureDefaultProfile(user, 'Cardiology', 'GH');
  console.log('Result Doctor Profile:', {
    id: profile.id,
    userId: profile.userId,
    referenceId: profile.referenceId,
    verificationStatus: profile.verificationStatus,
    country: profile.country
  });

  if (!profile.referenceId || !profile.referenceId.startsWith('CV-DR-')) {
    throw new Error('FAIL: Reference ID not formatted properly: ' + profile.referenceId);
  }

  console.log(`✅ SUCCESS! Doctor Reference ID generated: ${profile.referenceId}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
