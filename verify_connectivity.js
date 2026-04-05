import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

async function testConnections() {
  console.log('🔗 Testing System Connectivity...\n');
  let success = true;

  // 1. Test Database (Prisma/PostgreSQL)
  try {
    console.log('📡 [Database] Connecting to PostgreSQL...');
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
    console.log(`ℹ️ [Stripe] Mode: ${account.details_submitted ? 'Production-ready' : 'Test/Incomplete'}`);
  } catch (err) {
    console.error(`❌ [Stripe] API Connection failed: ${err.message}`);
    success = false;
  }

  // 3. Test Supabase (Direct)
  try {
    console.log('🔥 [Supabase] Testing Supabase Client...');
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) throw error;
    console.log('✅ [Supabase] Connection verified.');
  } catch (err) {
    console.error(`❌ [Supabase] Connection failed: ${err.message}`);
    success = false;
  }

  console.log('\n----------------------------------------');
  if (success) {
    console.log('🎉 All systems report successful connectivity!');
  } else {
    console.warn('⚠️ Some connectivity checks failed. Please check your .env variables.');
    process.exit(1);
  }

  await prisma.$disconnect();
}

testConnections();
