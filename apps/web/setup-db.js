// Database setup script to create tables in Supabase
import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'

// Read environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'MISSING')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? 'SET' : 'MISSING')
  process.exit(1)
}

// Create admin client with service role key for DDL operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function setupDatabase() {
  try {
    console.log('Setting up database tables...')
    
    // Read the latest migration file
    const migrationPath = join(process.cwd(), 'lib/db/migrations/0000_overjoyed_microchip.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split('--> statement-breakpoint')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('-->'))
    
    console.log(`Found ${statements.length} SQL statements to execute`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`Executing statement ${i + 1}/${statements.length}...`)
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      
      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error)
        // Don't exit on error as table might already exist
      } else {
        console.log(`Statement ${i + 1} executed successfully`)
      }
    }
    
    console.log('Database setup completed!')
    
    // Test the tables
    console.log('Testing table access...')
    
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('count', { count: 'exact', head: true })
    
    console.log('Companies table:', companiesError ? 'ERROR: ' + companiesError.message : 'SUCCESS')
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
    
    console.log('Users table:', usersError ? 'ERROR: ' + usersError.message : 'SUCCESS')
    
  } catch (error) {
    console.error('Setup failed:', error)
    process.exit(1)
  }
}

setupDatabase()
