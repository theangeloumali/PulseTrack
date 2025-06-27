'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase/client'

export default function TestSupabasePage() {
  const [logs, setLogs] = useState<string[]>([])
  const [testing, setTesting] = useState(false)

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testConnection = async () => {
    setTesting(true)
    setLogs([])
    
    addLog('Starting Supabase tests...')
    addLog(`Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
    addLog(`Supabase Key exists: ${!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`)
    
    try {
      // Test 1: Basic connection
      addLog('Testing basic connection...')
      const { data, error } = await supabase.from('companies').select('count(*)')
      
      if (error) {
        addLog(`❌ Connection error: ${error.message}`)
      } else {
        addLog(`✅ Connection successful: ${JSON.stringify(data)}`)
      }
      
      // Test 2: Auth signup
      addLog('Testing auth signup...')
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: `test-${Date.now()}@example.com`,
        password: 'testpassword123',
      })
      
      if (authError) {
        addLog(`❌ Auth signup error: ${authError.message}`)
      } else {
        addLog(`✅ Auth signup successful: ${JSON.stringify({ user: authData.user?.id, session: !!authData.session })}`)
      }
      
    } catch (err) {
      addLog(`❌ Unexpected error: ${err}`)
    }
    
    setTesting(false)
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      
      <button
        onClick={testConnection}
        disabled={testing}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4 disabled:opacity-50"
      >
        {testing ? 'Testing...' : 'Test Supabase Connection'}
      </button>
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold mb-2">Test Logs:</h2>
        <div className="space-y-1">
          {logs.map((log, index) => (
            <div key={index} className="text-sm font-mono">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
