const prisma = require("./prisma/prismaClient");
const corporateController = require("./controllers/corporate.controller");

// Mock Express response helper
function mockResponse() {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.jsonData = data;
    return res;
  };
  return res;
}

async function seed() {
  console.log("=== Seeding Test Corporate Accounts (No Cleanup) ===\n");

  // Cleanup past test data first to avoid duplicate conflicts
  await prisma.corporateAccount.deleteMany({
    where: {
      contactEmail: {
        in: [
          "test_small@company.com",
          "test_mid@company.com",
          "test_large@company.com",
          "test_large_override@company.com"
        ]
      }
    }
  });

  const accounts = [
    {
      companyName: "Small Corp",
      contactEmail: "test_small@company.com",
      maxSeats: 10
    },
    {
      companyName: "Mid Corp",
      contactEmail: "test_mid@company.com",
      maxSeats: 80
    },
    {
      companyName: "Large Corp",
      contactEmail: "test_large@company.com",
      maxSeats: 250
    },
    {
      companyName: "Negotiated Corp",
      contactEmail: "test_large_override@company.com",
      maxSeats: 250,
      pricePerSeatGHS: 9.50
    }
  ];

  for (const acc of accounts) {
    const req = { body: acc };
    const res = mockResponse();
    await corporateController.createAccount(req, res);
    
    if (res.statusCode === 201) {
      const created = res.jsonData.account;
      console.log(`Created: "${created.companyName}"`);
      console.log(`  ID: ${created.id}`);
      console.log(`  Tier: ${created.seatTier}`);
      console.log(`  Price: ${created.pricePerSeatGHS} GHS`);
      console.log(`  Seats: ${created.maxSeats}\n`);
    } else {
      console.error(`Failed to create ${acc.companyName}:`, res.jsonData);
    }
  }
}

seed().then(() => prisma.$disconnect()).catch(console.error);
