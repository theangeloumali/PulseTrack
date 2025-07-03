import { create } from 'zustand';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/db';
import { getUserById, createUser, createCompany } from '@/lib/db/service';
import type { User, NewUser, NewCompany } from '@/lib/db/schema';
import { clearAuthState, isRefreshTokenError } from '@/lib/auth-utils';

const isDevelopment = process.env.NODE_ENV === 'development';

export interface CreateUserData {
	firstName: string;
	lastName: string;
	companyName: string;
	companySlug: string;
	email: string;
	role: 'admin' | 'manager' | 'user';
}

export interface AuthState {
	user: User | null;
	supabaseUser: SupabaseUser | null;
	session: Session | null;
	isLoading: boolean;
	isInitializing: boolean;

	// Actions
	setUser: (user: User | null) => void;
	setSupabaseUser: (user: SupabaseUser | null) => void;
	setSession: (session: Session | null) => void;
	setIsLoading: (loading: boolean) => void;
	signUp: (email: string, password: string, userData: CreateUserData) => Promise<{ error?: any }>;
	signIn: (email: string, password: string) => Promise<{ error?: any }>;
	signOut: () => Promise<void>;
	verifyEmailAndCreateUser: (params: { token?: string; email?: string; tokenHash?: string }) => Promise<{ error?: any }>;
	initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
			user: null,
			supabaseUser: null,
			session: null,
			isLoading: true,
			isInitializing: false,

			setUser: (user) => set({ user }),
			setSupabaseUser: (user) => set({ supabaseUser: user }),
			setSession: (session) => set({ session }),
			setIsLoading: (loading) => set({ isLoading: loading }),

			signUp: async (email: string, password: string, userData: CreateUserData) => {
				try {
					const { data, error } = await supabase.auth.signUp({
						email,
						password,
						options: {
							emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/verify-email`,
							data: {
								firstName: userData.firstName,
								lastName: userData.lastName,
								companyName: userData.companyName,
								companySlug: userData.companySlug,
								role: userData.role,
							},
						},
					});

					if (error) {
						console.error('Signup error:', error);
						return { error };
					}
					// console.log('Signup data:', data);
					set({
						session: data.session,
						supabaseUser: data.user,
					});
					return { error: null };
				} catch (error) {
					console.error('Signup error:', error);
					return { error };
				}
			},

			signIn: async (email: string, password: string) => {
				try {
					// console.log('Attempting sign in for:', email);
					const { data, error } = await supabase.auth.signInWithPassword({
						email,
						password,
					});
					
					if (error) {
						console.error('Sign in error:', error);
						return { error };
					}

					if (data.user && data.session) {
						// console.log('Supabase sign in successful, setting session...');
						set({
							supabaseUser: data.user,
							session: data.session,
						});

						// Get user from database - this is critical for the app to work
						// console.log('Fetching user profile from database...');
						try {
							const dbUser = await getUserById(data.user.id);
							if (dbUser) {
								// console.log('Database user found, setting user state...');
								set({ user: dbUser, isLoading: false });
								return { error: null };
							} else {
								console.error('No user profile found in database for:', data.user.id);
								// Don't clear Supabase session immediately - keep it for retry
								set({ user: null, isLoading: false });
								return { error: new Error('User profile not found. Please contact support.') };
							}
						} catch (dbError) {
							console.error('Error fetching user from database:', dbError);
							// For database errors, don't clear the Supabase session
							// This allows for retry on network issues
							set({ user: null, isLoading: false });
							return { error: new Error('Failed to load user profile. Please try again.') };
						}
					}

					return { error: new Error('No user returned from sign in') };
				} catch (error) {
					console.error('Sign in error:', error);
					set({ isLoading: false });
					return { error };
				}
			},

			signOut: async () => {
				try {
					const { error } = await supabase.auth.signOut();

					if (error) {
						console.error('Sign out error:', error);
					}

					set({ user: null, supabaseUser: null, session: null });
				} catch (error) {
					console.error('Sign out error:', error);
				}
			},

			verifyEmailAndCreateUser: async (params: { token?: string; email?: string; tokenHash?: string }) => {
				try {
					const { token, email, tokenHash } = params;
					set({ isLoading: true });
// console.log('Starting email verification with params:', { token, email, tokenHash });
					let authResponse: any;

					// Flow 1: Email link verification (token_hash from URL)
					if (tokenHash) {
						// console.log('Attempting verification with token_hash...');
						authResponse = await supabase.auth.verifyOtp({
							token_hash: tokenHash,
							type: 'email', // This is the type for email link verification
						});
					}
					// Flow 2: Manual OTP code verification
					else if (token && email) {
						// console.log('Attempting verification with manual OTP code...');

						// Attempt 2a: Try with 'signup' type
						// console.log("Attempting with type: 'signup'");
						authResponse = await supabase.auth.verifyOtp({
							email: email,
							token: token,
							type: 'signup',
						});

						// Attempt 2b: If failed, try with 'email' type
						if (authResponse.error) {
							console.warn("Failed with type 'signup', trying 'email'", authResponse.error.message);
							// console.log("Attempting with type: 'email'");
							authResponse = await supabase.auth.verifyOtp({
								email: email,
								token: token,
								type: 'email',
							});
						}
					} else {
						set({ isLoading: false });
						return { error: new Error('Invalid verification parameters. Provide tokenHash or token and email.') };
					}

					// Fallback: Refresh session if direct verification failed
					// This can happen if the cookie is set but the response has an error
					if (authResponse.error) {
						console.warn('Direct verification failed, attempting session refresh as a fallback.', authResponse.error.message);
						const {
							data: { session: refreshedSession },
							error: refreshError,
						} = await supabase.auth.refreshSession();

						if (refreshedSession && !refreshError) {
							// console.log('Session refresh successful! Using refreshed session.');
							authResponse = {
								data: {
									user: refreshedSession.user,
									session: refreshedSession,
								},
								error: null,
							};
						}
					}

					// Final check for verification failure
					if (authResponse.error) {
						console.error('All verification attempts failed:', authResponse.error);
						set({ isLoading: false });
						return { error: authResponse.error };
					}

					// console.log('Verification successful.');
					const { user: authUser, session } = authResponse.data;

					if (!authUser || !session) {
						const error = new Error('Verification succeeded but no user/session was returned.');
						set({ isLoading: false });
						return { error };
					}

					// Update store with session info immediately
					set({ supabaseUser: authUser, session: session });

					// Check if user profile already exists in our public.users table
					const existingUser = await getUserById(authUser.id);
					if (existingUser) {
						// console.log('User profile already exists in DB. Setting user and finishing.');
						set({ user: existingUser, isLoading: false });
						return { error: null };
					}

					// Create user profile if it doesn't exist
					// console.log('User profile does not exist in DB. Creating new user...');
					const userMetadata = authUser.user_metadata;
					if (!userMetadata || !userMetadata.companyName || !userMetadata.companySlug) {
						const error = new Error('User metadata is missing for new user creation.');
						console.error(error.message, { metadata: userMetadata });
						set({ isLoading: false });
						return { error };
					}

					const company = await createCompany({
						name: userMetadata.companyName,
						slug: userMetadata.companySlug,
					});

					const newUser = await createUser({
						id: authUser.id,
						email: authUser.email!,
						first_name: userMetadata.firstName || '',
						last_name: userMetadata.lastName || '',
						role: userMetadata.role || 'admin',
						company_id: company.id,
					});

					// console.log('Successfully created new user profile.');
					set({
						user: newUser,
						isLoading: false,
					});

					return { error: null };
				} catch (error) {
					console.error('Unhandled error in verifyEmailAndCreateUser:', error);
					set({ isLoading: false });
					return { error };
				}
			},

			initialize: async () => {
				const { isInitializing } = get();
				
				// Prevent multiple simultaneous initialization calls
				if (isInitializing) {
					console.log('🔄 Auth Store: Initialization already in progress, waiting...');
					// Wait for current initialization to complete
					let attempts = 0;
					while (get().isInitializing && attempts < 30) {
						await new Promise(resolve => setTimeout(resolve, 100));
						attempts++;
					}
					return;
				}

				try {
					set({ isInitializing: true });
					console.log('🔄 Auth Store: Starting initialization...');
					
					// Get current session first
					const { data: { session }, error: sessionError } = await supabase.auth.getSession();
					
					if (sessionError) {
						console.error('❌ Auth Store: Error getting session:', sessionError);
						if (isRefreshTokenError(sessionError)) {
							console.log('🧹 Auth Store: Refresh token error detected, clearing corrupted state');
							clearAuthState();
							await supabase.auth.signOut();
							set({ session: null, supabaseUser: null, user: null, isLoading: false, isInitializing: false });
							return;
						}
						
						console.warn('❌ Auth Store: Non-auth error during session check, keeping partial state');
						set({ isLoading: false, user: null, isInitializing: false });
						return;
					}

					if (session?.user) {
						console.log('🔄 Auth Store: Valid session found, setting session and user...');
						set({
							session,
							supabaseUser: session.user,
						});

						// Fetch user from database
						try {
							const dbUser = await getUserById(session.user.id);
							if (dbUser) {
								console.log('✅ Auth Store: Database user found:', dbUser.email);
								set({ user: dbUser, isLoading: false, isInitializing: false });
							} else {
								console.log('❌ Auth Store: No database user found for:', session.user.id);
								set({ user: null, isLoading: false, isInitializing: false });
							}
						} catch (dbError) {
							console.error('❌ Auth Store: Error fetching user from database:', dbError);
							set({ user: null, isLoading: false, isInitializing: false });
						}
					} else {
						console.log('🔄 Auth Store: No valid session found');
						set({ session: null, supabaseUser: null, user: null, isLoading: false, isInitializing: false });
					}

					// Set up auth state change listener (only once)
					if (!get().session) {
						console.log('🔄 Auth Store: Setting up auth state change listener...');
						const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
							console.log('🔄 Auth Store: Auth state changed:', event, newSession?.user?.id);

							if (event === 'SIGNED_OUT') {
								console.log('🔄 Auth Store: User signed out');
								set({ session: null, supabaseUser: null, user: null, isLoading: false });
								return;
							}

							if (newSession?.user) {
								console.log('🔄 Auth Store: Setting session from auth change...');
								set({
									session: newSession,
									supabaseUser: newSession.user,
								});

								try {
									const dbUser = await getUserById(newSession.user.id);
									if (dbUser) {
										console.log('🔄 Auth Store: User updated from auth change:', dbUser.email);
										set({ user: dbUser, isLoading: false });
									} else {
										console.log('❌ Auth Store: No user found on auth change');
										set({ user: null, isLoading: false });
									}
								} catch (error) {
									console.error('❌ Auth Store: Error fetching user on auth change:', error);
									
									if (isRefreshTokenError(error)) {
										console.log('🧹 Auth Store: Refresh token error in auth change, clearing state');
										clearAuthState();
										await supabase.auth.signOut();
										set({ session: null, supabaseUser: null, user: null, isLoading: false });
										return;
									}
									
									set({ user: null, isLoading: false });
								}
							} else {
								console.log('🔄 Auth Store: Session cleared from auth change');
								set({ session: null, supabaseUser: null, user: null, isLoading: false });
							}
						});
					}

					console.log('✅ Auth Store: Initialization complete');
				} catch (error) {
					console.error('❌ Auth Store: Error in initialize:', error);
					await supabase.auth.signOut();
					set({ session: null, supabaseUser: null, user: null, isLoading: false, isInitializing: false });
				}
			},
		})
	);
