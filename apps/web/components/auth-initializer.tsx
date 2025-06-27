'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
	'/login',
	'/signup', 
	'/verify-email',
	'/forgot-password',
	'/reset-password'
];

// Routes that should redirect to dashboard if user is already authenticated
const AUTH_ROUTES = ['/login', '/signup'];

export function AuthInitializer() {
	const [mounted, setMounted] = useState(false);
	const [isInitialized, setIsInitialized] = useState(false);
	const [user, setUser] = useState<any>(null);
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (mounted && typeof window !== 'undefined') {
			// Dynamically import the auth store only on the client
			import('@/lib/stores/auth').then(({ useAuthStore }) => {
				const store = useAuthStore.getState();
				
				// Initialize auth
				store.initialize();
				
				// Set up subscription to auth state changes
				const unsubscribe = useAuthStore.subscribe(
					(state) => {
						setUser(state.user);
						setIsInitialized(true);
					}
				);

				// Set initial user state
				setUser(store.user);
				setIsInitialized(true);

				// Cleanup subscription on unmount
				return unsubscribe;
			});
		}
	}, [mounted]);

	// Handle route protection
	useEffect(() => {
		if (!isInitialized || !mounted) return;

		const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
		const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));

		// If user is authenticated and trying to access auth pages, redirect to dashboard
		if (user && isAuthRoute) {
			console.log('User authenticated, redirecting from auth page to dashboard');
			router.replace('/dashboard');
			return;
		}

		// If user is not authenticated and trying to access protected pages, redirect to login
		if (!user && !isPublicRoute) {
			console.log('User not authenticated, redirecting to login');
			router.replace('/login');
			return;
		}
	}, [user, pathname, isInitialized, mounted, router]);

	// Show loading spinner while initializing authentication
	if (!isInitialized || !mounted) {
		return (
			<div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
				<div className="text-center">
					<Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
					<p className="text-gray-600">Loading...</p>
				</div>
			</div>
		);
	}

	return null;
}
