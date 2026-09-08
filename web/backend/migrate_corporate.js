const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runCorporateMigration() {
    try {
        console.log("Starting Phase 6 Corporate Schema Migration...");

        // 1. Create CorporateSeatStatus enum if not exists
        await prisma.$executeRawUnsafe(`
            DO $$ BEGIN
                CREATE TYPE "CorporateSeatStatus" AS ENUM ('active', 'revoked');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
        console.log("✅ Enum 'CorporateSeatStatus' ensured.");

        // 2. Create CorporateAccount table if not exists
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "CorporateAccount" (
                "id" TEXT NOT NULL,
                "companyName" TEXT NOT NULL,
                "contactEmail" TEXT NOT NULL,
                "maxSeats" INTEGER NOT NULL DEFAULT 5,
                "activeEmployees" INTEGER NOT NULL DEFAULT 0,
                "pricePerSeatGHS" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
                "billingCycle" "BillingCycle" NOT NULL DEFAULT 'monthly',
                "isActive" BOOLEAN NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "CorporateAccount_pkey" PRIMARY KEY ("id")
            );
        `);
        console.log("✅ Table 'CorporateAccount' ensured.");

        // Unique index on contactEmail
        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "CorporateAccount_contactEmail_key" ON "CorporateAccount"("contactEmail");
        `);

        // 3. Create CorporateSeat table if not exists
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "CorporateSeat" (
                "id" TEXT NOT NULL,
                "corporateAccountId" TEXT NOT NULL,
                "employeeEmail" TEXT NOT NULL,
                "employeeUserId" TEXT,
                "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "status" "CorporateSeatStatus" NOT NULL DEFAULT 'active',
                CONSTRAINT "CorporateSeat_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "CorporateSeat_corporateAccountId_fkey" FOREIGN KEY ("corporateAccountId") REFERENCES "CorporateAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "CorporateSeat_employeeUserId_fkey" FOREIGN KEY ("employeeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
            );
        `);
        console.log("✅ Table 'CorporateSeat' ensured.");

        // Unique index on corporateAccountId + employeeEmail
        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "CorporateSeat_corporateAccountId_employeeEmail_key" ON "CorporateSeat"("corporateAccountId", "employeeEmail");
        `);

        console.log("🎉 Migration completed successfully!");
    } catch (e) {
        console.error("❌ Migration error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

runCorporateMigration();
