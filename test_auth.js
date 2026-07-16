const { supabaseAdmin } = require('./web/backend/lib/supabaseAdmin');

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
  // Just print the emails
  data.users.forEach(u => console.log(u.id, u.email));
}

checkUsers();
