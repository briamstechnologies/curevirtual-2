const prisma = require('./web/backend/prisma/prismaClient.js');
const { supabaseAdmin } = require('./web/backend/lib/supabaseAdmin.js');

async function syncUsers() {
  if (!supabaseAdmin) {
    console.error("Supabase Admin not configured");
    return;
  }
  
  console.log("Fetching Supabase Users...");
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error("Error fetching Supabase users:", error);
    return;
  }
  
  console.log(`Found ${users.length} users in Supabase.`);
  
  for (const su of users) {
    const dbUser = await prisma.user.findUnique({ where: { id: su.id } });
    if (!dbUser) {
      console.log(`User ${su.email} (${su.id}) exists in Supabase but NOT in Prisma DB. Deleting from Supabase...`);
      await supabaseAdmin.auth.admin.deleteUser(su.id);
      console.log(`✅ Deleted stuck user ${su.email}`);
    }
  }
  
  console.log("Sync complete!");
}

syncUsers();
