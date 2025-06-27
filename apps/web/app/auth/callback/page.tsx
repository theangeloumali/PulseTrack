'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { updateUserStatus } from '@/lib/db/service'

export default function AuthCallbackPage() {
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
        // Handle the auth callback
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          router.push('/login?error=callback_error')
          return
        }

        if (data.session?.user) {
          // If this is an invitation acceptance, activate the user
          if (type === 'invite') {
            try {
              await updateUserStatus(data.session.user.id, 'active')
              router.push('/dashboard?welcome=true')
            } catch (updateError) {
              console.error('Failed to activate user:', updateError)
              router.push('/dashboard')
            }
          } else {
            // Regular login callback
            router.push('/dashboard')
          }
        } else {
          router.push('/login')
        }
      } catch (error) {
        console.error('Callback handling error:', error)
        router.push('/login?error=callback_error')
      }
    }

    handleAuthCallback()
  }, [router, type])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">
          {type === 'invite' ? 'Setting up your account...' : 'Signing you in...'}
        </p>
      </div>
    </div>
  )
}
