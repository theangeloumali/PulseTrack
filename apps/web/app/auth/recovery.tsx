'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function RecoveryCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleRecoveryCallback = async () => {
      console.log('Recovery callback - Starting password reset flow')
      
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      try {
        // Check if we have a valid session from the password reset
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.error('Recovery callback - Error getting user:', error)
          router.push('/forgot-password?error=invalid_reset_link')
          return
        }

        if (user) {
          console.log('Recovery callback - Valid user session, redirecting to reset password')
          // User has valid session from password reset, redirect to reset password page
          router.push('/reset-password')
        } else {
          console.log('Recovery callback - No user session')
          router.push('/forgot-password?error=invalid_reset_link')
        }
      } catch (err) {
        console.error('Recovery callback - Unexpected error:', err)
        router.push('/forgot-password?error=recovery_failed')
      }
    }

    handleRecoveryCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Processing password reset...</p>
      </div>
    </div>
  )
}