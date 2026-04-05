const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function fixDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database.');

    console.log('🛠️ Adding missing columns...');
    
    // Add Stripe columns to User table
    await client.query('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;');
    console.log('✅ stripeCustomerId added to "User" table (if missing).');

    // Add Stripe columns to Subscription table
    await client.query('ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;');
    await client.query('ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;');
    await client.query('ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP;');
    await client.query('ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "provider" TEXT;');
    await client.query('ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "amount" INTEGER;');
    await client.query('ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "currency" TEXT;');
    await client.query('ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP;');
    await client.query('ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP;');
    console.log('✅ Stripe columns added to "Subscription" table (if missing).');

    console.log('🎉 Database fix complete.');
  } catch (err) {
    console.error('❌ Error fixing database:', err.message);
  } finally {
    await client.end();
  }
}

fixDatabase();
