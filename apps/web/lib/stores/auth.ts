import {create} from 'zustand';
import {User as SupabaseUser, Session} from '@supabase/supabase-js';
import {supabase} from '@/lib/db';
import {getUserWithCompany} from '@/lib/db/service';
import type {User, UserWithCompany, NewUser, NewCompany} from '@/lib/db/schema';
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

export interface SignupData {
  firstName: string;
  lastName: string;
  companyName: string;
  companySlug: string;
  role: string;
}

export interface AuthState {
  user: UserWithCompany | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  isLoading: boolean;
  isInitializing: boolean;
  signupInProgress: boolean;
  signupStartedAt: number;
  lastSessionCheck: number;

  // Actions
  setUser: (user: UserWithCompany | null) => void;
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
    correlationId?: string;
    signupData?: SignupData;
  }) => Promise<{error?: any}>;
  initialize: () => Promise<void>;
  recoverSession: () => Promise<boolean>;
  validateSession: () => Promise<boolean>;
}

// Module-level flag: ensures auth listener is registered exactly once
let authListenerRegistered = false;

// Staleness timeout for signupInProgress flag (60 seconds)
const SIGNUP_TIMEOUT_MS = 60_000;

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  supabaseUser: null,
  session: null,
  isLoading: true,
  isInitializing: false,
  signupInProgress: false,
  signupStartedAt: 0,
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
    correlationId?: string;
    signupData?: SignupData;
  }) => {
    const {token, email, tokenHash, correlationId, signupData} = params;
    const cid = correlationId || `verify-${Date.now()}`;

    // Step 1: Set flags to prevent interference from initialize() and onAuthStateChange.
    // NOTE: Do NOT set isLoading:true here — that triggers AuthGate to show the full-screen
    // loading overlay which UNMOUNTS VerifyEmailContent mid-flow, losing local state.
    // The verify-email screen manages its own local loading state independently.
    set({signupInProgress: true, signupStartedAt: Date.now()});
    console.log(`[signup-verify:${cid}] Starting email verification`);

    try {
      // Step 2: Call verifyOtp — single attempt, no retry loop
      let authUser: SupabaseUser | null = null;
      let session: Session | null = null;

      if (tokenHash) {
        console.log(`[signup-verify:${cid}] Processing email link verification`);
        const {data, error: otpError} = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'email',
        });

        if (!otpError && data.user && data.session) {
          // Step 3: verifyOtp succeeded — use returned user/session directly
          authUser = data.user;
          session = data.session;
        } else {
          // Step 4: verifyOtp failed — try session recovery with identity validation
          console.warn(
            `[signup-verify:${cid}] verifyOtp failed, attempting identity-validated session recovery`,
            otpError?.message,
          );
          const recovered = await supabase.auth.getSession();
          const recoveredSession = recovered.data.session;

          if (recoveredSession?.user) {
            // CRITICAL: Validate recovered session belongs to the same email.
            // If email is not available, we CANNOT validate identity — reject recovery.
            if (!email) {
              console.error(
                `[signup-verify:${cid}] Cannot validate recovered session: email param not provided`,
              );
              set({signupInProgress: false});
              return {
                error: {
                  message: 'Verification failed. Please try signing up again.',
                },
              };
            }
            if (recoveredSession.user.email !== email) {
              console.error(
                `[signup-verify:${cid}] Recovered session email mismatch: ${recoveredSession.user.email} !== ${email}`,
              );
              set({signupInProgress: false});
              return {
                error: {
                  message: 'Session mismatch. Please try signing up again.',
                },
              };
            }
            console.log(`[signup-verify:${cid}] Identity-validated session recovery successful`);
            authUser = recoveredSession.user;
            session = recoveredSession;
          }
        }
      } else if (token && email) {
        console.log(`[signup-verify:${cid}] Processing manual OTP verification`);
        const {data, error: otpError} = await supabase.auth.verifyOtp({
          email,
          token,
          type: 'email',
        });

        if (!otpError && data.user && data.session) {
          authUser = data.user;
          session = data.session;
        } else {
          console.warn(`[signup-verify:${cid}] OTP verification failed`, otpError?.message);
          // Try identity-validated session recovery
          const recovered = await supabase.auth.getSession();
          const recoveredSession = recovered.data.session;

          if (recoveredSession?.user && recoveredSession.user.email === email) {
            console.log(`[signup-verify:${cid}] Identity-validated session recovery successful`);
            authUser = recoveredSession.user;
            session = recoveredSession;
          }
        }
      } else {
        set({signupInProgress: false});
        return {
          error: new Error(
            'Invalid verification parameters. Provide tokenHash or token and email.',
          ),
        };
      }

      // Step 5: Final check — do we have a valid auth user and session?
      if (!authUser || !session) {
        console.error(`[signup-verify:${cid}] All verification attempts failed`);
        set({signupInProgress: false});
        return {
          error: {message: 'Verification failed. Please try again.'},
        };
      }

      // Step 6: Update store with session (NO setSession() call — verifyOtp already persisted it)
      console.log(`[signup-verify:${cid}] Verification successful, updating store`);
      set({supabaseUser: authUser, session});

      // Step 7: Check if user already exists in DB (idempotent — handles re-verification)
      try {
        const existingUser = await getUserWithCompany(authUser.id);
        if (existingUser) {
          console.log(`[signup-verify:${cid}] Existing user profile found, skipping provisioning`);
          set({user: existingUser, signupInProgress: false});
          return {error: null};
        }
      } catch (lookupError) {
        // Expected for brand-new users: RLS blocks the browser-client query
        console.log(`[signup-verify:${cid}] Pre-API user lookup failed (expected for new users)`);
      }

      // Step 8: Get signup data — prefer URL params (signupData), fallback to user_metadata
      const meta = authUser.user_metadata;
      const companyName = signupData?.companyName || meta?.companyName;
      const companySlug = signupData?.companySlug || meta?.companySlug;
      const firstName = signupData?.firstName || meta?.firstName || '';
      const lastName = signupData?.lastName || meta?.lastName || '';
      const role = signupData?.role || meta?.role || 'company_admin';

      if (!companyName || !companySlug) {
        console.error(
          `[signup-verify:${cid}] Missing company data from both URL params and metadata`,
          {
            signupData,
            metadata: meta,
          },
        );
        set({signupInProgress: false});
        return {
          error: {
            message:
              'Account setup incomplete. Company information is missing. Please try signing up again.',
          },
        };
      }

      // Step 9: POST to /api/auth/signup-complete
      if (!authUser.email) {
        console.error(`[signup-verify:${cid}] Auth user has no email address`);
        set({signupInProgress: false});
        return {
          error: {message: 'Account setup failed. No email address found. Please try again.'},
        };
      }

      console.log(`[signup-verify:${cid}] Calling signup-complete API`);
      const response = await fetch('/api/auth/signup-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          'x-correlation-id': cid,
        },
        body: JSON.stringify({
          company: {name: companyName, slug: companySlug},
          user: {
            id: authUser.id,
            email: authUser.email,
            first_name: firstName,
            last_name: lastName,
            role,
          },
        }),
      });

      const result = await response.json();
      console.log(`[signup-verify:${cid}] signup-complete response`, {
        status: response.status,
        ok: response.ok,
        hasData: !!result?.data,
        error: result?.error ?? null,
      });

      // Step 10: Handle API error
      if (!response.ok) {
        console.error(`[signup-verify:${cid}] Signup complete API error:`, result.error);
        set({signupInProgress: false});
        return {error: {message: result.error || 'Failed to create account'}};
      }

      // Step 11: Set user from API response
      const userData = result.data;
      if (userData?.company) {
        set({
          user: userData as UserWithCompany,
          signupInProgress: false,
        });
        return {error: null};
      }

      // Fallback: browser-client retry if API returned partial data
      console.log(
        `[signup-verify:${cid}] API data missing company, falling back to browser client`,
      );
      let hydratedUser = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        hydratedUser = await getUserWithCompany(authUser.id);
        if (hydratedUser) break;
        if (attempt < 2) await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }

      if (!hydratedUser) {
        set({signupInProgress: false});
        return {
          error: {
            message: 'Account created but profile could not be loaded. Please sign in.',
          },
        };
      }

      // Step 12: Success
      set({user: hydratedUser, signupInProgress: false});
      return {error: null};
    } catch (error: any) {
      console.error(`[signup-verify:${cid}] Unhandled error:`, error);
      set({signupInProgress: false});

      let userMessage = 'Failed to create your account. Please try again.';
      if (error.message?.includes('already exists')) {
        userMessage = 'An account with this email already exists.';
      } else if (error.message?.includes('network')) {
        userMessage = 'Network error. Please check your connection.';
      }

      return {error: {message: userMessage, originalError: error}};
    }
  },

  initialize: async () => {
    // Guard: if signup is in progress, skip initialization — unless the flag is stale
    const {signupInProgress, signupStartedAt} = get();
    if (signupInProgress) {
      const elapsed = Date.now() - signupStartedAt;
      if (elapsed < SIGNUP_TIMEOUT_MS) {
        console.log('Auth Store: Signup in progress, skipping initialization');
        return;
      }
      // Stale flag — reset it and proceed with initialization
      console.warn('Auth Store: signupInProgress flag stale (>60s), resetting');
      set({signupInProgress: false, signupStartedAt: 0});
    }

    const {isInitializing} = get();

    // Prevent multiple simultaneous initialization calls
    if (isInitializing) {
      console.log('Auth Store: Initialization already in progress, waiting...');
      let attempts = 0;
      while (get().isInitializing && attempts < 30) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }
      return;
    }

    try {
      set({isInitializing: true});
      console.log('Auth Store: Starting initialization...');

      // Get current session
      const {
        data: {session},
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Auth Store: Error getting session:', sessionError);
        if (isRefreshTokenError(sessionError)) {
          console.log('Auth Store: Refresh token error detected, clearing corrupted state');
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

        set({isLoading: false, user: null, isInitializing: false});
        return;
      }

      if (session?.user) {
        console.log('Auth Store: Valid session found, setting session and user...');
        set({session, supabaseUser: session.user});

        // Fetch user from database
        try {
          const dbUser = await getUserWithCompany(session.user.id);
          if (dbUser) {
            console.log('Auth Store: Database user found:', dbUser.email);
            set({user: dbUser, isLoading: false, isInitializing: false});
          } else {
            // No DB user — check for zombie signup session (has metadata but no DB row)
            const meta = session.user.user_metadata;
            if (meta?.companyName && meta?.companySlug) {
              console.log('Auth Store: Zombie signup detected, attempting recovery via API');
              try {
                const response = await fetch('/api/auth/signup-complete', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                    'x-correlation-id': `zombie-recovery-${Date.now()}`,
                  },
                  body: JSON.stringify({
                    company: {
                      name: meta.companyName,
                      slug: meta.companySlug,
                    },
                    user: {
                      id: session.user.id,
                      email: session.user.email || '',
                      first_name: meta.firstName || '',
                      last_name: meta.lastName || '',
                      role: meta.role || 'company_admin',
                    },
                  }),
                });

                if (response.ok) {
                  const result = await response.json();
                  if (result.data?.company) {
                    console.log('Auth Store: Zombie recovery successful');
                    set({
                      user: result.data as UserWithCompany,
                      isLoading: false,
                      isInitializing: false,
                    });
                  } else {
                    // Partial data — try getUserWithCompany
                    const recovered = await getUserWithCompany(session.user.id);
                    set({
                      user: recovered ?? null,
                      isLoading: false,
                      isInitializing: false,
                    });
                  }
                } else {
                  console.error('Auth Store: Zombie recovery API failed');
                  set({
                    user: null,
                    session: null,
                    supabaseUser: null,
                    isLoading: false,
                    isInitializing: false,
                  });
                }
              } catch (recoveryError) {
                console.error('Auth Store: Zombie recovery error:', recoveryError);
                set({
                  user: null,
                  session: null,
                  supabaseUser: null,
                  isLoading: false,
                  isInitializing: false,
                });
              }
            } else {
              console.log('Auth Store: No database user found for:', session.user.id);
              set({user: null, isLoading: false, isInitializing: false});
            }
          }
        } catch (dbError: any) {
          console.error('Auth Store: Error fetching user from database:', dbError?.message);
          set({user: null, isLoading: false, isInitializing: false});
        }
      } else {
        console.log('Auth Store: No valid session found');
        set({
          session: null,
          supabaseUser: null,
          user: null,
          isLoading: false,
          isInitializing: false,
        });
      }

      // Set up auth state change listener — exactly once via module-level flag
      if (!authListenerRegistered) {
        authListenerRegistered = true;
        console.log('Auth Store: Setting up auth state change listener...');
        supabase.auth.onAuthStateChange(async (event, newSession) => {
          console.log('Auth Store: Auth state changed:', event, newSession?.user?.id);

          // Guard: if signup is in progress, only update session/supabaseUser — don't fetch DB user
          if (get().signupInProgress) {
            console.log('Auth Store: Signup in progress, ignoring auth state change for DB lookup');
            if (newSession) {
              set({session: newSession, supabaseUser: newSession.user});
            }
            return;
          }

          if (event === 'SIGNED_OUT') {
            set({
              session: null,
              supabaseUser: null,
              user: null,
              isLoading: false,
            });
            return;
          }

          if (newSession?.user) {
            set({session: newSession, supabaseUser: newSession.user});

            try {
              const dbUser = await getUserWithCompany(newSession.user.id);
              if (dbUser) {
                set({user: dbUser, isLoading: false});
              } else if (!get().user) {
                set({isLoading: false});
              } else {
                set({isLoading: false});
              }
            } catch (error) {
              console.error('Auth Store: Error fetching user on auth change:', error);

              if (isRefreshTokenError(error)) {
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

              if (!get().user) {
                set({user: null, isLoading: false});
              } else {
                set({isLoading: false});
              }
            }
          } else {
            set({
              session: null,
              supabaseUser: null,
              user: null,
              isLoading: false,
            });
          }
        });
      }

      console.log('Auth Store: Initialization complete');
    } catch (error) {
      console.error('Auth Store: Error in initialize:', error);
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
