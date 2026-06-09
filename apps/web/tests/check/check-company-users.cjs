#!/usr/bin/env node

// Check what users exist in the company
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

async function checkCompanyUsers() {
  try {
    console.log('🔍 Checking users in company 0d94aa60-6ee1-4d50-af92-679626d8934f...\n');

    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, email, role, status, first_name, last_name')
      .eq('company_id', '0d94aa60-6ee1-4d50-af92-679626d8934f');

    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }

    if (!users || users.length === 0) {
      console.log('⚠️  No users found in this company');
      return;
    }

    console.log('📋 Users in company:');
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.role})`);
      console.log(`      ID: ${user.id}`);
      console.log(`      Status: ${user.status}`);
      console.log(`      Name: ${user.first_name} ${user.last_name}`);
      console.log('');
    });

    // Pick the first admin or manager for invited_by
    const adminOrManager = users.find(u => ['admin', 'manager'].includes(u.role));
    if (adminOrManager) {
      console.log('💡 Suggested invited_by ID:', adminOrManager.id);
      console.log(`   (${adminOrManager.email} - ${adminOrManager.role})`);
    }

  } catch (error) {
    console.error('❌ Script failed:', error.message);
  }
}

checkCompanyUsers();
