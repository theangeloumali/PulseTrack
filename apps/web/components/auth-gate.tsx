'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/signup', 
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/auth/accept-invitation'
];

// Routes that should redirect to dashboard if user is already authenticated
const AUTH_ROUTES = ['/login', '/signup'];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isRouteResolved, setIsRouteResolved] = useState(false);
  const { user, isLoading, isInitializing, initialize } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  // Mark as hydrated after component mounts
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Initialize auth when hydrated - do this as early as possible
  useEffect(() => {
    if (isHydrated && !isInitializing && isLoading) {
      console.log('🔄 AuthGate: Initializing auth...');
      // Start initialization immediately
      initialize();
    }
  }, [isHydrated, isInitializing, isLoading, initialize]);

  // Preload critical data when auth completes
  useEffect(() => {
    if (user && !isLoading && !isInitializing) {
      console.log('🔄 AuthGate: Auth complete, preloading critical data...');
      // You can add preloading logic here for user projects, notifications, etc.
      // This ensures the dashboard loads faster once the user gets there
    }
  }, [user, isLoading, isInitializing]);

  // Handle route resolution after auth is complete
  useEffect(() => {
    if (!isHydrated || isLoading || isInitializing) {
      setIsRouteResolved(false);
      return;
    }

    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
    const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));
    const isResetPasswordRoute = pathname.startsWith('/reset-password');
    const isAcceptInvitationRoute = pathname.startsWith('/auth/accept-invitation');

    console.log('🔄 AuthGate: Resolving route...', {
      pathname,
      user: user?.email,
      isPublicRoute,
      isAuthRoute
    });

    // Special routes that always allow access
    if (isResetPasswordRoute || isAcceptInvitationRoute) {
      setIsRouteResolved(true);
      return;
    }

    // If user is authenticated and trying to access auth pages, redirect to dashboard
    if (user && isAuthRoute) {
      console.log('🔄 AuthGate: Authenticated user on auth page, redirecting to dashboard');
      router.replace('/dashboard');
      return;
    }

    // If user is not authenticated and trying to access protected pages, redirect to login
    if (!user && !isPublicRoute) {
      console.log('🔄 AuthGate: Unauthenticated user on protected page, redirecting to login');
      router.replace('/login');
      return;
    }

    // Route is resolved, allow rendering
    setIsRouteResolved(true);
  }, [user, pathname, isHydrated, isLoading, isInitializing, router]);

  // Show loading screen during any auth-related loading or route resolution
  if (!isHydrated || isLoading || isInitializing || !isRouteResolved) {
    return <AuthLoadingScreen />;
  }

  return <>{children}</>;
}

function AuthLoadingScreen() {
  const [loadingText, setLoadingText] = useState('Initializing your workspace...');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const messages = [
      'Initializing your workspace...',
      'Loading your projects...',
      'Setting up your dashboard...',
      'Almost ready...'
    ];

    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setLoadingText(messages[index]);
      setProgress((prev) => Math.min(prev + 25, 90)); // Progress up to 90%
    }, 800);

    // Complete progress after a delay
    const completeTimer = setTimeout(() => {
      setProgress(100);
    }, 3200);

    return () => {
      clearInterval(interval);
      clearTimeout(completeTimer);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center z-50">
      <div className="text-center space-y-8 p-8 animate-in fade-in duration-500">
        {/* Logo/Brand area */}
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
          <span className="text-white font-bold text-2xl">PT</span>
        </div>
        
        {/* Loading spinner */}
        <div className="relative animate-in slide-in-from-bottom-4 duration-700 delay-150">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-blue-600" />
          <div className="absolute inset-0 rounded-full bg-blue-600 opacity-20 animate-ping"></div>
        </div>
        
        {/* Loading text */}
        <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-700 delay-300">
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-100 transition-all duration-500">
            {loadingText}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
            PulseTrack is preparing your personalized experience. This will only take a moment.
          </p>
        </div>
        
        {/* Progress indicator */}
        <div className="w-80 mx-auto space-y-2 animate-in slide-in-from-bottom-4 duration-700 delay-500">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Setting up...</span>
            <span>{progress}%</span>
          </div>
        </div>
        
        {/* Subtle animation elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-20 w-2 h-2 bg-blue-400 rounded-full animate-pulse opacity-40"></div>
          <div className="absolute top-40 right-32 w-1 h-1 bg-indigo-400 rounded-full animate-pulse opacity-60 delay-300"></div>
          <div className="absolute bottom-32 left-32 w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse opacity-30 delay-700"></div>
        </div>
      </div>
    </div>
  );
}