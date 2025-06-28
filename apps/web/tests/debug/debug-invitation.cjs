const https = require('https');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables manually
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key] = value;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!serviceRoleKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function debugInvitation() {
  try {
    // First, get an existing user to see the invitation flow
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('status', 'invited')
      .limit(1);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('No invited users found. Checking all users...');
      
      // Check all users first
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('*');

      if (allUsersError) {
        console.error('❌ Error fetching all users:', allUsersError);
        return;
      }

      console.log('\n� All users in DB:');
      allUsers.forEach(user => {
        console.log(`- ${user.email} (${user.status}) - ID: ${user.id}`);
      });

      console.log('\nNow checking their auth status...');
      
      // Check auth users
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('❌ Error fetching auth users:', authError);
        return;
      }

      console.log('\n🔐 Auth users:');
      authUsers.users.forEach(authUser => {
        console.log(`- ${authUser.email} - ID: ${authUser.id}`);
        console.log(`  Email confirmed: ${authUser.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`  Has password: ${authUser.encrypted_password ? 'Yes' : 'No'}`);
        console.log(`  Last sign in: ${authUser.last_sign_in_at || 'Never'}`);
        console.log(`  Metadata: ${JSON.stringify(authUser.user_metadata)}`);
        console.log('---');
      });

      return;
    }

    const invitedUser = users[0];
    console.log('🔍 Found invited user:', invitedUser.email);

    // Now check the auth user details
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      return;
    }

    const authUser = authUsers.users.find(u => u.id === invitedUser.id);
    
    if (!authUser) {
      console.log('❌ No corresponding auth user found');
      return;
    }

    console.log('\n📊 Auth User Details:');
    console.log('- ID:', authUser.id);
    console.log('- Email:', authUser.email);
    console.log('- Email confirmed:', authUser.email_confirmed_at ? 'Yes' : 'No');
    console.log('- Created:', authUser.created_at);
    console.log('- Last sign in:', authUser.last_sign_in_at || 'Never');
    console.log('- User metadata:', JSON.stringify(authUser.user_metadata, null, 2));
    console.log('- App metadata:', JSON.stringify(authUser.app_metadata, null, 2));

    // Check if user has a password set
    console.log('\n🔐 Auth Status:');
    console.log('- Has password:', authUser.encrypted_password ? 'Yes' : 'No');
    console.log('- Email confirmed:', authUser.email_confirmed_at ? 'Yes' : 'No');

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugInvitation();
