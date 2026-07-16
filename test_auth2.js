const { supabaseAdmin } = require('./lib/supabaseAdmin');

async function checkUsers() {
  if (!supabaseAdmin) {
    console.log("No supabaseAdmin");
    return;
  }
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.log("Error listing users:", error);
    return;
  }
  console.log("Total users in Supabase Auth:", data.users.length);
}

checkUsers();
