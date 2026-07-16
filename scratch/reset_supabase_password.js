const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://kmqqphbvjdbbixihqcpp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttcXFwaGJ2amRiYml4aWhxY3BwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDYwNzQwNSwiZXhwIjoyMDkwMTgzNDA1fQ.OXOnEPEBhNRGfv85CsdrRUWnbgRobsMyK3g848eu2iM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const email = 'ahmedali.64048@gmail.com';
  
  // 1. Get user by email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;
  
  const user = users.find(u => u.email === email);
  if (!user) {
    console.log(`User not found in Supabase Auth for email: ${email}`);
    return;
  }
  
  console.log(`Found user: ${user.id}`);
  
  // 2. Update password
  const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    { password: 'Password123!' }
  );
  if (updateError) throw updateError;
  
  console.log('Password updated successfully for Supabase Auth!');
}

main()
  .catch(console.error);
