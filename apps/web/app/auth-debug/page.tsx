'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function AuthDebugPage() {
  const [authUser, setAuthUser] = useState<any>(null)
  const [dbUser, setDbUser] = useState<any>(null)
  const [companies, setCompanies] = useState<any[]>([])
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check auth user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        setAuthUser(user)
        
        if (user) {
          // Check if user exists in our users table
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()
          
          setDbUser(userData)
          if (userError) {
            setError('User not found in users table: ' + userError.message)
          }
          
          // Check companies
          const { data: companiesData } = await supabase
            .from('companies')
            .select('*')
          
          setCompanies(companiesData || [])
        }
      } catch (err: any) {
        setError('Error: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
    
    checkAuth()
  }, [])

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Auth User</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(authUser, null, 2)}
          </pre>
        </div>
        
        <div className="bg-gray-50 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">DB User</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(dbUser, null, 2)}
          </pre>
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded mt-6">
        <h2 className="text-lg font-semibold mb-2">Companies ({companies.length})</h2>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(companies, null, 2)}
        </pre>
      </div>
    </div>
  )
}
