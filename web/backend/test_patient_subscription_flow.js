/**
 * TEST PATIENT SUBSCRIPTION FLOW
 * 
 * 1. Log in to Supabase using patient credentials.
 * 2. Sync with Backend to get a verified JWT.
 * 3. Call the create-subscription endpoint to initiate a Stripe session.
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const API_BASE_URL = 'http://localhost:5001/api';

const credentials = {
  email: 'rehan.code1514@gmail.com',
  password: '123123'
};

async function runTest() {
  console.log('🚀 Starting Patient Subscription Test Flow...');
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials in .env');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // 1. SIGN IN TO SUPABASE
    console.log(`🔐 Signing in to Supabase as ${credentials.email}...`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    });

    if (authError) {
      throw new Error(`Supabase Auth Error: ${authError.message}`);
    }

    const supabaseAccessToken = authData.session.access_token;
    const supabaseId = authData.user.id;
    console.log('✅ Supabase Auth Successful.');

    // 2. SYNC WITH BACKEND
    console.log(`📡 Syncing with Backend at ${API_BASE_URL}...`);
    const syncResponse = await axios.post(`${API_BASE_URL}/auth/login-sync`, {
      email: credentials.email,
      supabaseId: supabaseId,
      supabaseAccessToken: supabaseAccessToken
    });

    if (!syncResponse.data || !syncResponse.data.token) {
      throw new Error('Backend Sync Failed: No token returned');
    }

    const backendToken = syncResponse.data.token;
    console.log('✅ Backend Sync Successful. Obtained local JWT.');

    // 3. CREATE SUBSCRIPTION SESSION
    console.log('💳 Initiating Subscription create-subscription...');
    const subResponse = await axios.post(
      `${API_BASE_URL}/payments/create-subscription`,
      {
        planType: 'MONTHLY',
        userType: 'PATIENT'
      },
      {
        headers: {
          Authorization: `Bearer ${backendToken}`
        }
      }
    );

    if (subResponse.data && subResponse.data.url) {
      console.log('\n🎉 SUCCESS! Patient subscription initiated.');
      console.log('🔗 Stripe Checkout URL:', subResponse.data.url);
    } else {
      console.error('❌ Failed to get checkout URL:', subResponse.data);
    }

  } catch (error) {
    console.error('\n💥 Test Failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

runTest();
