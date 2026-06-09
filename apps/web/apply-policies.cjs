const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyPolicies() {
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'lib/db/enhanced-rls-policies.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Applying enhanced RLS policies...');
    
    // Execute the entire SQL file
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: sql 
    });
    
    if (error) {
      console.error('Error applying policies:', error);
      process.exit(1);
    }
    
    console.log('Enhanced RLS policies applied successfully!');
    console.log('Response:', data);
    
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

applyPolicies();