const path = require('path');

// Try loading .env from current directory AND root
require('dotenv').config(); 
if (!process.env.STRIPE_SECRET_KEY) {
    require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
}

const { PrismaClient } = require('@prisma/client');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function testConnections() {
  console.log('🔗 Testing Backend System Connectivity...\n');
  let success = true;

  // 1. Test Database (Prisma/PostgreSQL)
  try {
    console.log('📡 [Database] Connecting to PostgreSQL via Prisma...');
    const userCount = await prisma.user.count();
    console.log(`✅ [Database] Connected. Total users found: ${userCount}`);
  } catch (err) {
    console.error(`❌ [Database] Connection failed: ${err.message}`);
    success = false;
  }

  // 2. Test Stripe Connection
  try {
    console.log('💳 [Stripe] Connecting to Stripe API...');
    const account = await stripe.accounts.retrieve();
    console.log(`✅ [Stripe] Connected. Account ID: ${account.id} (${account.email || 'N/A'})`);
  } catch (err) {
    console.error(`❌ [Stripe] API Connection failed: ${err.message}`);
    success = false;
  }

  // 3. Test Supabase (Direct)
  try {
    console.log('🔥 [Supabase] Testing Supabase Client...');
    // Trying 'User' as mapped in Prisma
    let { error } = await supabase.from('User').select('id').limit(1);
    
    if (error) {
        console.log(`ℹ️ [Supabase] 'User' table check failed (${error.message}). Trying 'users'...`);
        let { error: error2 } = await supabase.from('users').select('id').limit(1);
        if (error2) throw error2;
    }
    console.log('✅ [Supabase] Connection verified.');
  } catch (err) {
    console.error(`❌ [Supabase] Connection failed: ${err.message}`);
    success = false;
  }

  console.log('\n----------------------------------------');
  if (success) {
    console.log('🎉 All systems report successful connectivity!');
  } else {
    console.warn('⚠️ Some connectivity checks failed.');
    process.exit(1);
  }

  await prisma.$disconnect();
}

testConnections();
