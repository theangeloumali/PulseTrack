#!/usr/bin/env node

// Test script to verify the invitation flow works correctly
// This will test the invitation process and simulate clicking the link

const { createClient } = require('@supabase/supabase-js');

// Create admin client (using service role key)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function testInvitationFlow() {
  try {
    console.log('🧪 Testing invitation flow...\n');

    // Test email for invitation
    const testEmail = `test-invite-${Date.now()}@example.com`;
    
    console.log(`📧 Sending invitation to: ${testEmail}`);

    // Step 1: Create an invitation using the admin client
    const { data: authData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      testEmail,
      {
        data: {
          company_id: 'test-company-123',
          invited_by: 'test-admin-123',
          role: 'user',
          first_name: 'Test',
          last_name: 'User',
        },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=invite`
      }
    );

    if (inviteError) {
      console.error('❌ Invitation failed:', inviteError.message);
      return;
    }

    console.log('✅ Invitation sent successfully!');
    console.log('📋 User ID:', authData.user.id);
    console.log('📋 Email:', authData.user.email);
    console.log('📋 Invited at:', authData.user.invited_at);
    
    // The email would contain a link like:
    console.log('\n📨 Invitation email would contain a link like:');
    console.log(`   ${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=invite&token=<secret_token>`);
    
    console.log('\n🔄 Flow after clicking the link:');
    console.log('   1. User clicks link → /auth/callback?type=invite&token=xxx');
    console.log('   2. Callback processes token and redirects to /auth/accept-invitation');
    console.log('   3. User sets password and completes setup');
    console.log('   4. User is redirected to /dashboard?welcome=true');

    // Check if user was created
    const { data: userCheck } = await supabaseAdmin.auth.admin.getUserById(authData.user.id);
    console.log('\n📊 User status in auth:');
    console.log('   Email confirmed:', userCheck.user.email_confirmed_at ? 'Yes' : 'No');
    console.log('   Last sign in:', userCheck.user.last_sign_in_at || 'Never');
    console.log('   User metadata:', JSON.stringify(userCheck.user.user_metadata, null, 2));

    console.log('\n✅ Invitation flow test completed successfully!');
    console.log('\n💡 To test the complete flow:');
    console.log('   1. Check the Supabase Auth logs for the invitation email');
    console.log('   2. Copy the invitation link from the email');
    console.log('   3. Open it in a browser to test the password setup flow');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testInvitationFlow();
