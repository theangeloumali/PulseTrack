import {create} from 'zustand';
import {User as SupabaseUser, Session} from '@supabase/supabase-js';
import {supabase} from '@/lib/db';
import {
  getUserById,
  getUserWithCompany,
  createUser,
  createCompany,
  createCompanyAndUser,
} from '@/lib/db/service';
import type {User, NewUser, NewCompany} from '@/lib/db/schema';
import {clearAuthState, isRefreshTokenError} from '@/lib/auth-utils';

const isDevelopment = process.env.NODE_ENV === 'development';

export interface CreateUserData {
  firstName: string;
  lastName: string;
  companyName: string;
  companySlug: string;
  email: string;
  role: 'company_admin' | 'manager' | 'user';
}

export interface AuthState {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  isLoading: boolean;
  isInitializing: boolean;
  lastSessionCheck: number;

  // Actions
  setUser: (user: User | null) => void;
  setSupabaseUser: (user: SupabaseUser | null) => void;
  setSession: (session: Session | null) => void;
  setIsLoading: (loading: boolean) => void;
  signUp: (email: string, password: string, userData: CreateUserData) => Promise<{error?: any}>;
  signIn: (email: string, password: string) => Promise<{error?: any}>;
  signOut: () => Promise<void>;
  verifyEmailAndCreateUser: (params: {
    token?: string;
    email?: string;
    tokenHash?: string;
  }) => Promise<{error?: any}>;
  initialize: () => Promise<void>;
  recoverSession: () => Promise<boolean>;
  validateSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  supabaseUser: null,
  session: null,
  isLoading: true,
  isInitializing: false,
  lastSessionCheck: 0,

  setUser: (user) => set({user}),
  setSupabaseUser: (user) => set({supabaseUser: user}),
  setSession: (session) => set({session, lastSessionCheck: Date.now()}),
  setIsLoading: (loading) => set({isLoading: loading}),

  signUp: async (email: string, password: string, userData: CreateUserData) => {
    try {
      const {data, error} = await supabase.auth.signUp({
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
        return {error};
      }
      // console.log('Signup data:', data);
      set({
        session: data.session,
        supabaseUser: data.user,
      });
      return {error: null};
    } catch (error) {
      console.error('Signup error:', error);
      return {error};
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      // console.log('Attempting sign in for:', email);
      const {data, error} = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        return {error};
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
          const dbUser = await getUserWithCompany(data.user.id);
          if (dbUser) {
            // console.log('Database user found, setting user state...');
            set({user: dbUser, isLoading: false});
            return {error: null};
          } else {
            console.error('No user profile found in database for:', data.user.id);
            // Don't clear Supabase session immediately - keep it for retry
            set({user: null, isLoading: false});
            return {
              error: new Error('User profile not found. Please contact support.'),
            };
          }
        } catch (dbError) {
          console.error('Error fetching user from database:', dbError);
          console.error('Full error JSON:', JSON.stringify(dbError, null, 2));
          // For database errors, don't clear the Supabase session
          // This allows for retry on network issues
          set({user: null, isLoading: false});
          return {
            error: new Error('Failed to load user profile. Please try again.'),
          };
        }
      }

      return {error: new Error('No user returned from sign in')};
    } catch (error) {
      console.error('Sign in error:', error);
      set({isLoading: false});
      return {error};
    }
  },

  signOut: async () => {
    try {
      const {error} = await supabase.auth.signOut();

      if (error) {
        console.error('Sign out error:', error);
      }

      set({user: null, supabaseUser: null, session: null});
    } catch (error) {
      console.error('Sign out error:', error);
    }
  },

  verifyEmailAndCreateUser: async (params: {
    token?: string;
    email?: string;
    tokenHash?: string;
  }) => {
    try {
      const {token, email, tokenHash} = params;
      set({isLoading: true});
      console.log('🔐 Starting email verification...');

      let authResponse: any;
      let retryCount = 0;
      const maxRetries = 2;

      // Flow 1: Email link verification (token_hash from URL)
      if (tokenHash) {
        console.log('🔗 Processing email link verification...');

        // Simple retry loop for email link verification
        while (retryCount <= maxRetries) {
          authResponse = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'email',
          });

          if (!authResponse.error) break;

          retryCount++;
          if (retryCount <= maxRetries) {
            console.log(`🔄 Retry ${retryCount}/${maxRetries} for email link verification...`);
            await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
          }
        }
      }
      // Flow 2: Manual OTP code verification - Use only 'email' type
      else if (token && email) {
        console.log('📧 Processing manual OTP verification...');

        // Simple retry loop for manual OTP verification
        while (retryCount <= maxRetries) {
          authResponse = await supabase.auth.verifyOtp({
            email: email,
            token: token,
            type: 'email', // Use only 'email' type for consistency
          });

          if (!authResponse.error) break;

          retryCount++;
          if (retryCount <= maxRetries) {
            console.log(`🔄 Retry ${retryCount}/${maxRetries} for OTP verification...`);
            await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
          }
        }
      } else {
        set({isLoading: false});
        return {
          error: new Error(
            'Invalid verification parameters. Provide tokenHash or token and email.',
          ),
        };
      }

      // Enhanced session recovery with persistence check
      if (authResponse.error) {
        console.warn(
          '⚠️ Verification failed, attempting session recovery...',
          authResponse.error.message,
        );

        // First, check if we have a valid session already
        const {
          data: {session: currentSession},
        } = await supabase.auth.getSession();

        if (currentSession?.user) {
          console.log('✅ Found existing valid session');
          authResponse = {
            data: {
              user: currentSession.user,
              session: currentSession,
            },
            error: null,
          };
        } else {
          // Try to refresh the session as last resort
          const {
            data: {session: refreshedSession},
            error: refreshError,
          } = await supabase.auth.refreshSession();

          if (refreshedSession && !refreshError) {
            console.log('🔄 Session refresh successful!');
            authResponse = {
              data: {
                user: refreshedSession.user,
                session: refreshedSession,
              },
              error: null,
            };
          }
        }
      }

      // Final check for verification failure
      if (authResponse.error) {
        console.error('❌ All verification attempts failed:', authResponse.error);
        set({isLoading: false});

        // Provide user-friendly error messages
        let userMessage = 'Verification failed. Please try again.';
        if (authResponse.error.message?.includes('expired')) {
          userMessage = 'Your verification code has expired. Please request a new one.';
        } else if (
          authResponse.error.message?.includes('Invalid') ||
          authResponse.error.message?.includes('invalid')
        ) {
          userMessage = 'Invalid verification code. Please check and try again.';
        } else if (authResponse.error.message?.includes('network')) {
          userMessage = 'Network error. Please check your connection and try again.';
        }

        return {error: {message: userMessage, originalError: authResponse.error}};
      }

      console.log('✅ Verification successful!');
      const {user: authUser, session} = authResponse.data;

      if (!authUser || !session) {
        console.error('⚠️ Verification succeeded but no user/session was returned');
        set({isLoading: false});
        return {error: {message: 'Session creation failed. Please try logging in again.'}};
      }

      // Update store with session info immediately to prevent session loss
      console.log('💾 Persisting session...');
      set({supabaseUser: authUser, session: session});

      // Force a session refresh to ensure it's properly stored
      await supabase.auth.setSession(session);

      // Check if user profile already exists in our public.users table
      const existingUser = await getUserWithCompany(authUser.id);
      if (existingUser) {
        // console.log('User profile already exists in DB. Setting user and finishing.');
        set({user: existingUser, isLoading: false});
        return {error: null};
      }

      // Create user profile if it doesn't exist
      // console.log('User profile does not exist in DB. Creating new user...');
      const userMetadata = authUser.user_metadata;
      if (!userMetadata || !userMetadata.companyName || !userMetadata.companySlug) {
        const error = new Error('User metadata is missing for new user creation.');
        console.error(error.message, {metadata: userMetadata});
        set({isLoading: false});
        return {error};
      }

      // Use atomic creation to ensure both company and user are created together
      const {user: newUserWithCompany} = await createCompanyAndUser(
        {
          name: userMetadata.companyName,
          slug: userMetadata.companySlug,
        },
        {
          id: authUser.id,
          email: authUser.email!,
          first_name: userMetadata.firstName || '',
          last_name: userMetadata.lastName || '',
          role: userMetadata.role || 'company_admin',
        },
      );

      // console.log('Successfully created new user profile.');
      set({
        user: newUserWithCompany,
        isLoading: false,
      });

      return {error: null};
    } catch (error: any) {
      console.error('Unhandled error in verifyEmailAndCreateUser:', error);
      set({isLoading: false});

      // Return more user-friendly error messages
      let userMessage = 'Failed to create your account. Please try again.';

      if (error.message?.includes('already exists')) {
        userMessage = 'An account with this email already exists.';
      } else if (error.message?.includes('network')) {
        userMessage = 'Network error. Please check your connection.';
      } else if (error.message?.includes('metadata')) {
        userMessage = 'Account setup incomplete. Please try signing up again.';
      }

      return {error: {message: userMessage, originalError: error}};
    }
  },

  initialize: async () => {
    const {isInitializing} = get();

    // Prevent multiple simultaneous initialization calls
    if (isInitializing) {
      console.log('🔄 Auth Store: Initialization already in progress, waiting...');
      // Wait for current initialization to complete
      let attempts = 0;
      while (get().isInitializing && attempts < 30) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }
      return;
    }

    try {
      set({isInitializing: true});
      console.log('🔄 Auth Store: Starting initialization...');

      // Get current session first
      const {
        data: {session},
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('❌ Auth Store: Error getting session:', sessionError);
        if (isRefreshTokenError(sessionError)) {
          console.log('🧹 Auth Store: Refresh token error detected, clearing corrupted state');
          clearAuthState();
          await supabase.auth.signOut();
          set({
            session: null,
            supabaseUser: null,
            user: null,
            isLoading: false,
            isInitializing: false,
          });
          return;
        }

        console.warn('❌ Auth Store: Non-auth error during session check, keeping partial state');
        set({isLoading: false, user: null, isInitializing: false});
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
          const dbUser = await getUserWithCompany(session.user.id);
          if (dbUser) {
            console.log('✅ Auth Store: Database user found:', dbUser.email);
            set({user: dbUser, isLoading: false, isInitializing: false});
          } else {
            console.log('❌ Auth Store: No database user found for:', session.user.id);
            set({user: null, isLoading: false, isInitializing: false});
          }
        } catch (dbError: any) {
          console.error('❌ Auth Store: Error fetching user from database:', {
            message: dbError?.message || 'Unknown error',
            code: dbError?.code,
            details: dbError?.details,
            hint: dbError?.hint,
            stack: dbError?.stack,
          });
          console.error('❌ Auth Store: Full error JSON:', JSON.stringify(dbError, null, 2));
          set({user: null, isLoading: false, isInitializing: false});
        }
      } else {
        console.log('🔄 Auth Store: No valid session found');
        set({
          session: null,
          supabaseUser: null,
          user: null,
          isLoading: false,
          isInitializing: false,
        });
      }

      // Set up auth state change listener (only once)
      if (!get().session) {
        console.log('🔄 Auth Store: Setting up auth state change listener...');
        const {
          data: {subscription},
        } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          console.log('🔄 Auth Store: Auth state changed:', event, newSession?.user?.id);

          if (event === 'SIGNED_OUT') {
            console.log('🔄 Auth Store: User signed out');
            set({
              session: null,
              supabaseUser: null,
              user: null,
              isLoading: false,
            });
            return;
          }

          if (newSession?.user) {
            console.log('🔄 Auth Store: Setting session from auth change...');
            set({
              session: newSession,
              supabaseUser: newSession.user,
            });

            try {
              const dbUser = await getUserWithCompany(newSession.user.id);
              if (dbUser) {
                console.log('🔄 Auth Store: User updated from auth change:', dbUser.email);
                set({user: dbUser, isLoading: false});
              } else {
                console.log('❌ Auth Store: No user found on auth change');
                set({user: null, isLoading: false});
              }
            } catch (error) {
              console.error('❌ Auth Store: Error fetching user on auth change:', error);

              if (isRefreshTokenError(error)) {
                console.log('🧹 Auth Store: Refresh token error in auth change, clearing state');
                clearAuthState();
                await supabase.auth.signOut();
                set({
                  session: null,
                  supabaseUser: null,
                  user: null,
                  isLoading: false,
                });
                return;
              }

              set({user: null, isLoading: false});
            }
          } else {
            console.log('🔄 Auth Store: Session cleared from auth change');
            set({
              session: null,
              supabaseUser: null,
              user: null,
              isLoading: false,
            });
          }
        });
      }

      console.log('✅ Auth Store: Initialization complete');
    } catch (error) {
      console.error('❌ Auth Store: Error in initialize:', error);
      await supabase.auth.signOut();
      set({
        session: null,
        supabaseUser: null,
        user: null,
        isLoading: false,
        isInitializing: false,
      });
    }
  },

  // Session recovery mechanism
  recoverSession: async () => {
    try {
      console.log('🔄 Attempting session recovery...');
      const {session} = get();

      // If we already have a valid session, just validate it
      if (session?.access_token) {
        const isValid = await get().validateSession();
        if (isValid) return true;
      }

      // Try to get a fresh session
      const {
        data: {session: freshSession},
        error,
      } = await supabase.auth.getSession();

      if (error || !freshSession) {
        console.error('❌ Session recovery failed:', error);
        return false;
      }

      // Update the store with recovered session
      set({
        session: freshSession,
        supabaseUser: freshSession.user,
        lastSessionCheck: Date.now(),
      });

      // Try to load the user data
      if (freshSession.user) {
        try {
          const dbUser = await getUserWithCompany(freshSession.user.id);
          if (dbUser) {
            set({user: dbUser});
            console.log('✅ Session recovery successful!');
            return true;
          }
        } catch (error) {
          console.error('⚠️ Session recovered but user data load failed:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('💥 Unexpected error during session recovery:', error);
      return false;
    }
  },

  // Validate current session
  validateSession: async () => {
    try {
      const {session, lastSessionCheck} = get();

      // Skip validation if we checked recently (within 5 minutes)
      const now = Date.now();
      if (now - lastSessionCheck < 5 * 60 * 1000) {
        return !!session;
      }

      if (!session) return false;

      // Check if the session is still valid
      const {
        data: {user},
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        console.warn('⚠️ Session validation failed:', error);

        // Try to refresh the session
        const {
          data: {session: refreshedSession},
          error: refreshError,
        } = await supabase.auth.refreshSession();

        if (refreshError || !refreshedSession) {
          console.error('❌ Session refresh failed:', refreshError);
          return false;
        }

        // Update with refreshed session
        set({
          session: refreshedSession,
          supabaseUser: refreshedSession.user,
          lastSessionCheck: Date.now(),
        });

        return true;
      }

      set({lastSessionCheck: Date.now()});
      return true;
    } catch (error) {
      console.error('💥 Unexpected error during session validation:', error);
      return false;
    }
  },
}));
