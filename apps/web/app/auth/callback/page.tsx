'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get('type')

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      try {
        console.log('Callback - Processing auth callback for type:', type)
        console.log('Callback - Current URL:', window.location.href)
        console.log('Callback - Search params:', window.location.search)
        console.log('Callback - Hash:', window.location.hash)
        
        // For invitation callbacks, handle Supabase's verification redirect
        if (type === 'invite') {
          // When Supabase redirects back from email verification, it includes
          // either URL parameters or we need to exchange a code
          const urlParams = new URLSearchParams(window.location.search)
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          
          console.log('Callback - URL params:', Object.fromEntries(urlParams.entries()))
          console.log('Callback - Hash params:', Object.fromEntries(hashParams.entries()))
          
          // Check for different types of auth data that Supabase might send
          const code = urlParams.get('code')
          const accessToken = urlParams.get('access_token') || hashParams.get('access_token')
          const refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token')
          const error = urlParams.get('error') || hashParams.get('error')
          
          if (error) {
            console.error('Callback - Auth error from Supabase:', error)
            router.push('/login?error=' + encodeURIComponent(error))
            return
          }
          
          // Try code exchange first (PKCE flow)
          if (code) {
            console.log('Callback - Found auth code, exchanging for session')
            try {
              const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
              
              if (exchangeError) {
                console.error('Callback - Code exchange error:', exchangeError)
                router.push('/login?error=code_exchange_failed')
                return
              }
              
              if (sessionData.session?.user) {
                console.log('Callback - Session established via code exchange')
                console.log('Callback - User:', sessionData.session.user.id)
                console.log('Callback - Metadata:', sessionData.session.user.user_metadata)
                
                // Add a small delay to ensure session is fully synced before redirecting
                setTimeout(() => {
                  router.push('/auth/accept-invitation')
                }, 100)
                return
              }
            } catch (codeError) {
              console.error('Callback - Code exchange failed:', codeError)
            }
          }
          
          // Try direct token method (older flow)
          if (accessToken) {
            console.log('Callback - Found access token, setting session')
            try {
              const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || ''
              })
              
              if (sessionError) {
                console.error('Callback - Error setting session:', sessionError)
                router.push('/login?error=session_failed')
                return
              }
              
              if (sessionData.session?.user) {
                console.log('Callback - Session set via tokens')
                console.log('Callback - User:', sessionData.session.user.id)
                
                // Add a small delay to ensure session is fully synced before redirecting
                setTimeout(() => {
                  router.push('/auth/accept-invitation')
                }, 100)
                return
              }
            } catch (tokenError) {
              console.error('Callback - Token session failed:', tokenError)
            }
          }
          
          // If no code or tokens, try to get existing session
          console.log('Callback - No code/tokens found, checking existing session')
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError) {
            console.error('Callback - Session check error:', sessionError)
            router.push('/login?error=session_check_failed')
            return
          }
          
          if (sessionData.session?.user) {
            console.log('Callback - Found existing session')
            console.log('Callback - User:', sessionData.session.user.id)
            
            // Check if user needs to complete setup
            const userMetadata = sessionData.session.user.user_metadata
            const setupComplete = userMetadata?.setup_complete
            
            console.log('Callback - Setup complete:', setupComplete)
            
            if (!setupComplete) {
              // Add a small delay to ensure session is fully synced before redirecting
              setTimeout(() => {
                router.push('/auth/accept-invitation')
              }, 100)
            } else {
              setTimeout(() => {
                router.push('/dashboard?welcome=true')
              }, 100)
            }
          } else {
            console.log('Callback - No session found anywhere, redirecting to login')
            router.push('/login?error=no_session_after_invite')
          }
        } else {
          // Regular login callback
          const { data, error } = await supabase.auth.getSession()
          
          if (error) {
            console.error('Auth callback error:', error)
            router.push('/login?error=callback_error')
            return
          }

          if (data.session?.user) {
            console.log('Callback - Regular login, redirecting to dashboard')
            router.push('/dashboard')
          } else {
            console.log('Callback - No session, redirecting to login')
            router.push('/login')
          }
        }
      } catch (error) {
        console.error('Callback handling error:', error)
        router.push('/login?error=callback_exception')
      }
    }

    handleAuthCallback()
  }, [router, type])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">
          {type === 'invite' ? 'Processing your invitation...' : 'Signing you in...'}
        </p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
