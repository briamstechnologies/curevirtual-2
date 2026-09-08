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

async function runTests() {
  console.log("=== Running Corporate Tier and Min Seats Tests ===");

  // Cleanup past test data
  await prisma.corporateAccount.deleteMany({
    where: {
      contactEmail: {
        in: [
          "test_small@company.com",
          "test_mid@company.com",
          "test_large@company.com",
          "test_large_override@company.com",
          "test_invalid@company.com"
        ]
      }
    }
  });

  // Test 1: Minimum Seats Limit (maxSeats = 3)
  console.log("\n--- Test 1: Enforce min_seats = 5 ---");
  const req1 = {
    body: {
      companyName: "Too Small Corp",
      contactEmail: "test_invalid@company.com",
      maxSeats: 3
    }
  };
  const res1 = mockResponse();
  await corporateController.createAccount(req1, res1);
  console.log("Status Code:", res1.statusCode);
  console.log("Response Message:", res1.jsonData?.message);
  if (res1.statusCode === 400 && res1.jsonData?.message.includes("Minimum 5 seats required")) {
    console.log("✅ PASS: Correctly rejected creation with 3 seats.");
  } else {
    console.error("❌ FAIL: Failed to reject creation with 3 seats.");
  }

  // Test 2: Small Tier (maxSeats = 10)
  console.log("\n--- Test 2: Small Tier (10 seats) ---");
  const req2 = {
    body: {
      companyName: "Small Corp",
      contactEmail: "test_small@company.com",
      maxSeats: 10
    }
  };
  const res2 = mockResponse();
  await corporateController.createAccount(req2, res2);
  console.log("Status Code:", res2.statusCode);
  console.log("Created Account:", res2.jsonData?.account);
  const smallAcc = res2.jsonData?.account;
  if (
    res2.statusCode === 201 &&
    smallAcc.seatTier === "small" &&
    smallAcc.pricePerSeatGHS === 20.0
  ) {
    console.log("✅ PASS: Small Tier correctly set (tier: small, price: 20 GHS).");
  } else {
    console.error("❌ FAIL: Small Tier incorrect.");
  }

  // Test 3: Mid Tier (maxSeats = 80)
  console.log("\n--- Test 3: Mid Tier (80 seats) ---");
  const req3 = {
    body: {
      companyName: "Mid Corp",
      contactEmail: "test_mid@company.com",
      maxSeats: 80
    }
  };
  const res3 = mockResponse();
  await corporateController.createAccount(req3, res3);
  console.log("Status Code:", res3.statusCode);
  console.log("Created Account:", res3.jsonData?.account);
  const midAcc = res3.jsonData?.account;
  if (
    res3.statusCode === 201 &&
    midAcc.seatTier === "mid" &&
    midAcc.pricePerSeatGHS === 14.0
  ) {
    console.log("✅ PASS: Mid Tier correctly set (tier: mid, price: 14 GHS).");
  } else {
    console.error("❌ FAIL: Mid Tier incorrect.");
  }

  // Test 4: Large Tier (maxSeats = 250)
  console.log("\n--- Test 4: Large Tier (250 seats) ---");
  const req4 = {
    body: {
      companyName: "Large Corp",
      contactEmail: "test_large@company.com",
      maxSeats: 250
    }
  };
  const res4 = mockResponse();
  await corporateController.createAccount(req4, res4);
  console.log("Status Code:", res4.statusCode);
  console.log("Created Account:", res4.jsonData?.account);
  const largeAcc = res4.jsonData?.account;
  if (
    res4.statusCode === 201 &&
    largeAcc.seatTier === "large" &&
    largeAcc.pricePerSeatGHS === 12.0
  ) {
    console.log("✅ PASS: Large Tier correctly set (tier: large, price: 12 GHS).");
  } else {
    console.error("❌ FAIL: Large Tier incorrect.");
  }

  // Test 5: Price Manual Override (Negotiable)
  console.log("\n--- Test 5: Manual Price Override for Large Tier ---");
  const req5 = {
    body: {
      companyName: "Negotiated Corp",
      contactEmail: "test_large_override@company.com",
      maxSeats: 250,
      pricePerSeatGHS: 9.50
    }
  };
  const res5 = mockResponse();
  await corporateController.createAccount(req5, res5);
  console.log("Status Code:", res5.statusCode);
  console.log("Created Account:", res5.jsonData?.account);
  const overrideAcc = res5.jsonData?.account;
  if (
    res5.statusCode === 201 &&
    overrideAcc.seatTier === "large" &&
    overrideAcc.pricePerSeatGHS === 9.50
  ) {
    console.log("✅ PASS: Manual override correct (tier: large, price: 9.5 GHS).");
  } else {
    console.error("❌ FAIL: Manual override failed.");
  }

  // Cleanup test data
  console.log("\nCleaning up test data...");
  await prisma.corporateAccount.deleteMany({
    where: {
      id: {
        in: [
          smallAcc?.id,
          midAcc?.id,
          largeAcc?.id,
          overrideAcc?.id
        ].filter(Boolean)
      }
    }
  });
  console.log("Cleanup finished.");
}

runTests()
  .then(() => prisma.$disconnect())
  .catch(err => {
    console.error("Test execution error:", err);
    prisma.$disconnect();
  });
