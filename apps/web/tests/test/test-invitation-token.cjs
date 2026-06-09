#!/usr/bin/env node

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

async function testInvitationToken() {
  try {
    console.log('🔍 Testing invitation token mechanism...\n');

    // Get the recently created invited user
    const userId = '102779ef-7109-4424-8192-b2e1d2522ee6';
    
    console.log('📋 Checking user:', userId);

    // Get auth user details
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (authError) {
      console.error('❌ Error fetching auth user:', authError);
      return;
    }

    console.log('✅ Auth user found:');
    console.log('- ID:', authUser.user.id);
    console.log('- Email:', authUser.user.email);
    console.log('- Email confirmed:', authUser.user.email_confirmed_at ? 'Yes' : 'No');
    console.log('- Has password:', authUser.user.encrypted_password ? 'Yes' : 'No');
    console.log('- Created:', authUser.user.created_at);
    console.log('- Confirmation sent:', authUser.user.confirmation_sent_at);
    console.log('- Invite sent:', authUser.user.invite_sent_at);
    console.log('- Recovery sent:', authUser.user.recovery_sent_at);
    console.log('- User metadata:', JSON.stringify(authUser.user.user_metadata, null, 2));
    console.log('- App metadata:', JSON.stringify(authUser.user.app_metadata, null, 2));

    // Now try to generate an admin auth token for this user
    console.log('\n🔑 Generating admin token...');
    
    const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: authUser.user.email,
      options: {
        redirectTo: 'http://localhost:3002/auth/callback?type=invite'
      }
    });

    if (tokenError) {
      console.error('❌ Error generating token:', tokenError);
      return;
    }

    console.log('✅ Token generated successfully!');
    console.log('🔗 Action link:', tokenData.properties.action_link);
    console.log('🔑 Hashed token:', tokenData.properties.hashed_token);
    console.log('📧 Email OTP:', tokenData.properties.email_otp);
    console.log('📱 Phone OTP:', tokenData.properties.phone_otp);

    // Extract the actual invitation URL
    const actionLink = tokenData.properties.action_link;
    console.log('\n📎 Test this URL in your browser:');
    console.log(actionLink);

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testInvitationToken();
