const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');
const fetch = require('node-fetch');

// Polyfill fetch and Headers for Node 16 (required for @supabase/supabase-js)
if (!global.fetch) {
  global.fetch = fetch;
  global.Headers = fetch.Headers;
  global.Request = fetch.Request;
  global.Response = fetch.Response;
}

// Ensure env vars are loaded even if this file is required early
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('--- Supabase Admin Init ---');
console.log('URL defined:', !!supabaseUrl);
console.log('Key defined:', !!supabaseServiceRoleKey);
if (supabaseUrl) console.log('URL starts with:', supabaseUrl.substring(0, 10));

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ CRITICAL: Supabase URL or Service Role Key is missing!');
}

let supabaseAdmin = null;
try {
  if (supabaseUrl && supabaseServiceRoleKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('✅ Supabase Admin client initialized');
  }
} catch (err) {
  console.error('❌ Failed to create Supabase Admin client:', err.message);
}

module.exports = { supabaseAdmin };

