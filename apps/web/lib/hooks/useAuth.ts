'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth'
import { useCompanyStore } from '@/lib/stores/company'
import { ensureUserRecord } from '@/lib/auth-helpers'
import type { User } from '@/lib/types/database'

export function useAuth() {
  const { user, isLoading, setUser, setIsLoading, logout } = useAuthStore()
  const { setCompany } = useCompanyStore()
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        try {
          // Ensure user record exists in our custom tables
          await ensureUserRecord(session.user)
          
          // Fetch user data from our users table
          const { data: userData, error } = await supabase
            .from('users')
            .select(`
              *,
              companies (*)
            `)
            .eq('id', session.user.id)
            .single()

          if (userData) {
            setUser(userData as User)
            if (userData.companies) {
              setCompany(userData.companies)
            }
          } else if (error) {
            console.error('Failed to fetch user data:', error)
            await supabase.auth.signOut()
          }
        } catch (error) {
          console.error('Error ensuring user record:', error)
          await supabase.auth.signOut()
        }
      }
      setIsLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            // Ensure user record exists in our custom tables
            await ensureUserRecord(session.user)
            
            const { data: userData, error } = await supabase
              .from('users')
              .select(`
                *,
                companies (*)
              `)
              .eq('id', session.user.id)
              .single()

            if (userData) {
              setUser(userData as User)
              if (userData.companies) {
                setCompany(userData.companies)
              }
            } else if (error) {
              console.error('Failed to fetch user data:', error)
              await supabase.auth.signOut()
            }
          } catch (error) {
            console.error('Error ensuring user record:', error)
            await supabase.auth.signOut()
          }
        } else if (event === 'SIGNED_OUT') {
          logout()
          setCompany(null)
        }
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [setUser, setIsLoading, logout, setCompany, supabase])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    // If sign in is successful but user doesn't exist in our users table,
    // we'll handle it in the auth state change listener
    return { data, error }
  }

  const signUp = async (email: string, password: string, userData: {
    firstName: string
    lastName: string
    companyName?: string
    companySlug?: string
    role?: 'admin' | 'manager' | 'user'
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email)
    return { data, error }
  }

  return {
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  }
}
