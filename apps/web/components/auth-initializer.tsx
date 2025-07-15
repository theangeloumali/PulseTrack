'use client';

import {useEffect, useState} from 'react';
import {useRouter, usePathname} from 'next/navigation';
import {Loader2} from 'lucide-react';
import {useResetPasswordStore} from '@/lib/stores/reset-password';
import {useAccountSetupStore} from '@/lib/stores/account-setup';

const isDevelopment = true; // Temporarily enabled for debugging

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/auth/accept-invitation',
];

// Routes that should redirect to dashboard if user is already authenticated
const AUTH_ROUTES = ['/login', '/signup'];

export function AuthInitializer() {
  const [mounted, setMounted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();
  const {isValidResetFlow, clearPasswordResetFlow} = useResetPasswordStore();
  const {isValidSetupFlow, clearAccountSetupFlow} = useAccountSetupStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      if (isDevelopment) {
        console.log('🔄 AuthInitializer: Starting auth initialization...');
      }

      let unsubscribe: (() => void) | undefined;

      // Dynamically import the auth store only on the client
      import('@/lib/stores/auth').then(async ({useAuthStore}) => {
        const store = useAuthStore.getState();

        if (isDevelopment) {
          console.log('🔄 AuthInitializer: Store imported, current user:', store.user);
          console.log('🔄 AuthInitializer: Store isLoading:', store.isLoading);
          console.log('🔄 AuthInitializer: Store isInitializing:', store.isInitializing);
        }

        // Set up subscription to auth state changes FIRST
        unsubscribe = useAuthStore.subscribe((state) => {
          if (isDevelopment) {
            console.log(
              `🔄 AuthInitializer: Store state changed - user: ${state.user ? `${state.user.first_name} (${state.user.email})` : 'null'}, isLoading: ${state.isLoading}, isInitializing: ${state.isInitializing}, hasSupabaseUser: ${!!state.supabaseUser}, hasSession: ${!!state.session}`,
            );
          }
          setUser(state.user);
          // Only mark as initialized when not loading and not initializing
          if (!state.isLoading && !state.isInitializing) {
            setIsInitialized(true);
          }
        });

        // Set initial user state from current store
        const currentState = useAuthStore.getState();
        setUser(currentState.user);
        if (!currentState.isLoading && !currentState.isInitializing) {
          setIsInitialized(true);
        }

        // Initialize auth only if not already initializing or initialized
        if (
          !currentState.isInitializing &&
          (currentState.isLoading || (!currentState.session && !currentState.user))
        ) {
          if (isDevelopment) {
            console.log('🔄 AuthInitializer: Calling store.initialize()...');
          }
          try {
            await store.initialize();
            if (isDevelopment) {
              console.log('🔄 AuthInitializer: Initialize completed');
            }
          } catch (error) {
            if (isDevelopment) {
              console.error('❌ AuthInitializer: Initialize failed:', error);
            }
          }
        } else {
          if (isDevelopment) {
            console.log(
              '🔄 AuthInitializer: Skipping initialization - already done or in progress',
            );
          }
        }
      });

      // Cleanup function
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }
  }, [mounted]);

  // Handle route protection
  useEffect(() => {
    if (!isInitialized || !mounted) return;

    const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
    const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
    const isResetPasswordRoute = pathname.startsWith('/reset-password');
    const isAcceptInvitationRoute = pathname.startsWith('/auth/accept-invitation');

    if (isDevelopment) {
      console.log(
        `🔄 AuthInitializer: Route protection check - pathname: ${pathname}, user: ${user ? `${user.first_name} (${user.email})` : 'null'}, isPublicRoute: ${isPublicRoute}, isAuthRoute: ${isAuthRoute}, isResetPasswordRoute: ${isResetPasswordRoute}, isAcceptInvitationRoute: ${isAcceptInvitationRoute}, mounted: ${mounted}, isInitialized: ${isInitialized}`,
      );
    }

    // Special handling for reset password route - always allow it regardless of auth state
    if (isResetPasswordRoute) {
      if (isDevelopment) {
        console.log('🔄 AuthInitializer: Reset password route detected, allowing access');
      }
      return;
    }

    // Special handling for accept invitation route - always allow it regardless of auth state
    if (isAcceptInvitationRoute) {
      if (isDevelopment) {
        console.log('🔄 AuthInitializer: Accept invitation route detected, allowing access');
      }
      return;
    }

    // Check if user is authenticated and in a password reset flow
    if (user && isValidResetFlow() && !isResetPasswordRoute) {
      if (isDevelopment) {
        console.log(
          '🔄 AuthInitializer: User authenticated with valid reset flow, redirecting to reset password',
        );
      }
      router.replace('/reset-password');
      return;
    }

    // Check if user is authenticated and in an account setup flow
    if (user && isValidSetupFlow() && !isAcceptInvitationRoute) {
      if (isDevelopment) {
        console.log(
          '🔄 AuthInitializer: User authenticated with valid setup flow, redirecting to accept invitation',
        );
      }
      router.replace('/auth/accept-invitation');
      return;
    }

    // If user is authenticated and trying to access auth pages, redirect to dashboard
    if (user && isAuthRoute) {
      if (isDevelopment) {
        console.log(
          '🔄 AuthInitializer: User authenticated, redirecting from auth page to dashboard',
        );
      }
      router.replace('/dashboard');
      return;
    }

    // If user is not authenticated and trying to access protected pages, redirect to login
    if (!user && !isPublicRoute) {
      if (isDevelopment) {
        console.log('🔄 AuthInitializer: User not authenticated, redirecting to login');
      }
      router.replace('/login');
      return;
    }
  }, [user, pathname, isInitialized, mounted, router]);

  // Show loading spinner while initializing authentication
  if (!isInitialized || !mounted) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-foreground font-medium">Setting up your workspace...</p>
          <p className="text-sm text-muted-foreground mt-2">This will only take a moment</p>
        </div>
      </div>
    );
  }

  return null;
}
