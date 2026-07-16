const { PrismaClient } = require('@prisma/client');
const { ensureDefaultProfile } = require('./lib/provisionProfile');
const prisma = new PrismaClient();

async function main() {
  const patientProfiles = await prisma.patientProfile.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1,
    include: { user: true }
  });
  
  if (patientProfiles.length === 0) {
    console.log("No profiles found");
    return;
  }
  
  const p = patientProfiles[0];
  console.log("Found profile:", { id: p.id, referenceId: p.referenceId, country: p.country });
  
  if (p.user) {
    try {
      console.log("Calling ensureDefaultProfile for user:", p.user.id);
      const updated = await ensureDefaultProfile(p.user, null, null);
      console.log("Result:", updated);
    } catch (e) {
      console.error("Error in ensureDefaultProfile:", e);
    }
  }
}

main().finally(() => prisma.$disconnect());
