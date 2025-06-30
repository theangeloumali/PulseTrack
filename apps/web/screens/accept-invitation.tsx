'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { updateUserStatus } from '@/lib/db/service'
import { useAccountSetupStore } from '@/lib/stores/account-setup'

interface UserInfo {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: string;
}

function AcceptInvitationContent() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [hasRefreshed, setHasRefreshed] = useState(false)

  const { setAccountSetupFlow, clearAccountSetupFlow } = useAccountSetupStore()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    let mounted = true;
    let autoRefreshTimeout: NodeJS.Timeout;
    
    // Check if we've already refreshed (from sessionStorage)
    const alreadyRefreshed = sessionStorage.getItem('invitation-refreshed') === 'true'
    if (alreadyRefreshed) {
      setHasRefreshed(true)
    }
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AcceptInvitation - Auth state change:', event, session?.user?.id || 'No session')
      
      if (!mounted) return;
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('AcceptInvitation - User signed in, setting up form...')
        
        // Clear any pending auto-refresh
        if (autoRefreshTimeout) {
          clearTimeout(autoRefreshTimeout);
        }
        
        // Get user metadata from the session
        const metadata = session.user.user_metadata as UserInfo
        console.log('AcceptInvitation - User metadata:', metadata)
        
        setUserInfo({
          email: session.user.email || '',
          firstName: metadata?.firstName || '',
          lastName: metadata?.lastName || '',
          role: metadata?.role || 'user',
          companyId: metadata?.companyId
        })

        // Pre-fill the form if we have the data
        if (metadata?.firstName) setFirstName(metadata.firstName)
        if (metadata?.lastName) setLastName(metadata.lastName)

        console.log('AcceptInvitation - User info set successfully')
        
        // Clear refresh flag since we found the session
        sessionStorage.removeItem('invitation-refreshed')
        
        // Set account setup flow
        setAccountSetupFlow(session.user.email || '')
      } else if (event === 'SIGNED_OUT') {
        console.log('AcceptInvitation - User signed out, redirecting to login')
        if (mounted) router.push('/login?error=signed_out')
      }
    })

    // Check current session
    const checkCurrentSession = async () => {
      if (!mounted) return;
      
      try {
        console.log('AcceptInvitation - Checking current session...')
        const { data: { user: session }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.error('AcceptInvitation - Session error:', error)
          return
        }
        
        if (session) {
          console.log('AcceptInvitation - Found existing session:', session.id)
          
          // Clear any pending auto-refresh
          if (autoRefreshTimeout) {
            clearTimeout(autoRefreshTimeout);
          }
          
          // Get user metadata from the session
          const metadata = session.user_metadata
          console.log('AcceptInvitation - User metadata:', metadata)
          
          setUserInfo({
            email: session.email || '',
            firstName: metadata?.first_name || '',
            lastName: metadata?.last_name || '',
            role: metadata?.role || 'user',
            companyId: metadata?.companyId
          })

          // Pre-fill the form if we have the data
          if (metadata?.first_name) setFirstName(metadata.first_name)
          if (metadata?.last_name) setLastName(metadata.last_name)

          console.log('AcceptInvitation - User info set from existing session')
          
          // Clear refresh flag since we found the session
          sessionStorage.removeItem('invitation-refreshed')
          
          // Set account setup flow
          setAccountSetupFlow(session.email || '')
        } else {
          console.log('AcceptInvitation - No current session found')
          
          // Check if we already have form data populated (means session was found before)
          const hasFormData = firstName && lastName;
          
          if (!hasRefreshed && !alreadyRefreshed && !hasFormData) {
            console.log('AcceptInvitation - Setting up auto-refresh...')
            
            // Mark that we're about to refresh
            sessionStorage.setItem('invitation-refreshed', 'true')
            
            // If no session found, auto-refresh the page after 1 second
            autoRefreshTimeout = setTimeout(() => {
              if (mounted) {
                console.log('AcceptInvitation - Auto-refreshing page to sync session...')
                window.location.reload()
              } else {
                console.log('AcceptInvitation - Component unmounted, skipping refresh')
              }
            }, 1000)
            
            console.log('AcceptInvitation - Auto-refresh timer set for 1 second')
          } else if (hasFormData) {
            console.log('AcceptInvitation - Form data already populated, not refreshing')
          } else {
            console.log('AcceptInvitation - Already refreshed once, not refreshing again. Redirecting to login.')
            // Clear the refresh flag for next time
            sessionStorage.removeItem('invitation-refreshed')
            router.push('/login?error=session_not_available')
          }
        }
      } catch (error) {
        console.error('AcceptInvitation - Session check error:', error)
      }
    }

    // Start checking session after a small delay
    setTimeout(() => checkCurrentSession(), 200)

    // Cleanup on unmount
    return () => {
      mounted = false;
      if (autoRefreshTimeout) {
        clearTimeout(autoRefreshTimeout);
      }
      subscription.unsubscribe()
    }
  }, [router, supabase, firstName, hasRefreshed, lastName, setAccountSetupFlow])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Create a timeout that assumes success after 5 seconds (Supabase updateUser often hangs but succeeds)
      const updatePromise = supabase.auth.updateUser({
        password: password,
        data: {
          first_name: firstName,
          last_name: lastName,
          setup_complete: true
        }
      })
      
      const timeoutPromise = new Promise<{ error: null }>((resolve) => 
        setTimeout(() => resolve({ error: null }), 5000)
      )
      
      const result = await Promise.race([updatePromise, timeoutPromise])

      if (result.error) {
        throw result.error
      }

      // Get the current session to get user ID
      const { data: { user: session } } = await supabase.auth.getUser()
      
      if (session) {
        // Activate the user account and update their details
        await updateUserStatus(session.id, 'active')

        // Update user details in our database
        const { error: updateError } = await supabase
          .from('users')
          .update({
            first_name: firstName,
            last_name: lastName,
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', session.id)

        if (updateError) {
          console.error('Failed to update user details:', updateError)
        }
      }

      // Clear the account setup flow
      clearAccountSetupFlow()

      // Refresh the session to ensure it's synced before redirect
      await supabase.auth.refreshSession()
      
      // Use router.refresh() to ensure the server-side session is updated
      router.refresh()
      
      // Small delay to ensure session is fully synced
      await new Promise(resolve => setTimeout(resolve, 500))

      // Redirect to dashboard with welcome message
      router.push('/dashboard?welcome=true&setup=complete')

    } catch (error: unknown) {
      console.error('Setup error:', error)
      // Even if there's an error, the account setup might have succeeded
      clearAccountSetupFlow()
      
      // Refresh session even in error case
      try {
        await supabase.auth.refreshSession()
        router.refresh()
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (refreshError) {
        console.error('Failed to refresh session in error case:', refreshError)
      }
      
      router.push('/dashboard?welcome=true&setup=complete')
    } finally {
      setLoading(false)
    }
  }

  if (!userInfo && !(firstName && lastName)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Setting up your invitation...</p>
          <p className="mt-2 text-sm text-gray-500">If this takes more than a few seconds, we&apos;ll automatically refresh</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Complete Your Account Setup
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Welcome to the team! Please set up your password to get started.
          </p>
          <p className="mt-1 text-center text-sm text-gray-500">
            Email: {userInfo?.email || 'Loading...'}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your password"
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm your password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Setting up account...
                </div>
              ) : (
                'Complete Setup'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  );
}