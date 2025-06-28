#!/usr/bin/env node

// Complete invitation test - creates both auth user and database record
const { createClient } = require('@supabase/supabase-js');

// Load environment variables manually
const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key] = value;
  }
});

// Create admin client (using service role key)
const supabaseAdmin = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function testCompleteInvitationFlow() {
  try {
    console.log('🧪 Testing complete invitation flow...\n');

    const testEmail = 'carions46@gmail.com';
    // Use proper UUIDs for testing
    const companyId = 'dd55cfcb-26b4-4a02-8337-2aba297df27c'; // real company ID
    const invitedBy = '7c071ced-d3f1-4bbd-8e70-370a91f9f42a'; // real user ID
    
    console.log(`📧 Sending invitation to: ${testEmail}`);

    // Step 1: Create auth user with Supabase (sends invitation email)
    const { data: authData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      testEmail,
      {
        data: {
          company_id: companyId,
          invited_by: invitedBy,
          role: 'user',
          first_name: 'Andrew',
          last_name: 'Hamli',
          hourly_rate: 5,
        },
        redirectTo: `https://pulsetrack-zkidz-web.vercel.app/auth/callback?type=invite`
      }
    );

    if (inviteError || !authData.user) {
      console.error('❌ Auth invitation failed:', inviteError);
      return;
    }

    console.log('✅ Auth user created successfully!');
    console.log('📋 User ID:', authData.user.id);

    // Step 2: Create user record in database
    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: testEmail,
        role: 'user',
        company_id: companyId,
        invited_by: invitedBy,
        invited_at: new Date().toISOString(),
        first_name: 'Angelo',
        last_name: 'Carions',
        hourly_rate: 50,
        status: 'inactive'
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database record creation failed:', dbError);
      // Clean up auth user if database creation fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        console.log('🧹 Cleaned up auth user');
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError);
      }
      return;
    }

    console.log('✅ Database record created successfully!');
    console.log('📋 Database User:', JSON.stringify(dbUser, null, 2));

    // Verify the user exists in database
    const { data: userCheck, error: checkError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (checkError) {
      console.error('❌ Failed to verify user in database:', checkError);
    } else {
      console.log('✅ User verified in database:', JSON.stringify(userCheck, null, 2));
    }

    console.log('\n🎉 Complete invitation flow test successful!');
    console.log('\n📨 Check your email for the invitation link');
    console.log('🔗 Invitation link format: http://localhost:3002/auth/callback?type=invite&token=xxx');
    
    console.log('\n🔄 Next steps:');
    console.log('1. Click the invitation link in your email');
    console.log('2. Should redirect to /auth/callback');
    console.log('3. Should then redirect to /auth/accept-invitation'); 
    console.log('4. Set password and complete setup');
    console.log('5. User status should change from "inactive" to "active"');

  } catch (error) {
    console.error('❌ Complete test failed:', error.message);
  }
}

testCompleteInvitationFlow();
