#!/usr/bin/env node

// Check what companies exist in the database
const { createClient } = require('@supabase/supabase-js');

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

async function checkDatabase() {
  try {
    console.log('🔍 Checking database for existing records...\n');

    // Check companies
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id, name')
      .limit(5);

    if (companiesError) {
      console.error('❌ Error fetching companies:', companiesError);
    } else {
      console.log('🏢 Companies in database:');
      companies.forEach(company => {
        console.log(`  - ${company.name} (${company.id})`);
      });
    }

    // Check users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, role, company_id')
      .limit(5);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
    } else {
      console.log('\n👥 Users in database:');
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.id}) - ${user.role} - Company: ${user.company_id}`);
      });
    }

    if (companies && companies.length > 0 && users && users.length > 0) {
      const company = companies[0];
      const admin = users.find(u => u.role === 'admin' || u.role === 'manager');
      
      if (admin) {
        console.log('\n✅ Found data for testing:');
        console.log(`Company ID: ${company.id}`);
        console.log(`Admin/Manager ID: ${admin.id}`);
        console.log('\nUse these IDs in the test script!');
      } else {
        console.log('\n⚠️  No admin/manager users found. Create one first.');
      }
    } else {
      console.log('\n⚠️  No companies or users found. You need to set up the database first.');
    }

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

checkDatabase();
