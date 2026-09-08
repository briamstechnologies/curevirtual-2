const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCorporate() {
  try {
    const corpAccounts = await prisma.corporateAccount.findMany();
    console.log("=== Corporate Accounts ===");
    console.table(corpAccounts);
  } catch(e) {
    console.log("Error querying corporateAccount:", e.message);
  }
}

checkCorporate().then(() => prisma.$disconnect()).catch(console.error);
