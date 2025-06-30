import { supabase } from '@/lib/db';
import { useAuthStore } from '@/lib/stores/auth';

const SESSION_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes
const SESSION_EXPIRE_WARNING = 5 * 60 * 1000; // 5 minutes before expiry

class SessionManager {
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.startPeriodicRefresh();
      this.setupVisibilityListener();
    }
  }

  /**
   * Start periodic session refresh
   */
  private startPeriodicRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(async () => {
      await this.checkAndRefreshSession();
    }, SESSION_REFRESH_INTERVAL);
  }

  /**
   * Refresh session when tab becomes visible
   */
  private setupVisibilityListener() {
    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden) {
        // Tab became visible, check session
        await this.checkAndRefreshSession();
      }
    });
  }

  /**
   * Check and refresh session if needed
   */
  async checkAndRefreshSession(): Promise<boolean> {
    if (this.isRefreshing) return true;

    try {
      this.isRefreshing = true;
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session check failed:', error);
        this.handleSessionError();
        return false;
      }

      if (!session) {
        console.log('No active session found');
        this.handleSessionExpired();
        return false;
      }

      // Check if session is close to expiry
      const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : null;
      const now = new Date();
      
      if (expiresAt && (expiresAt.getTime() - now.getTime()) < SESSION_EXPIRE_WARNING) {
        console.log('Session close to expiry, refreshing...');
        
        const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('Session refresh failed:', refreshError);
          this.handleSessionError();
          return false;
        }

        if (newSession) {
          console.log('Session refreshed successfully');
          // Update auth store
          const authStore = useAuthStore.getState();
          authStore.setSession(newSession);
          authStore.setSupabaseUser(newSession.user);
          return true;
        } else {
          console.error('No new session returned from refresh');
          this.handleSessionExpired();
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Session management error:', error);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Force refresh session immediately
   */
  async forceRefresh(): Promise<boolean> {
    console.log('Force refreshing session...');
    
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Force refresh failed:', error);
        this.handleSessionError();
        return false;
      }

      if (session) {
        console.log('Force refresh successful');
        // Update auth store
        const authStore = useAuthStore.getState();
        authStore.setSession(session);
        authStore.setSupabaseUser(session.user);
        return true;
      } else {
        console.error('No session returned from force refresh');
        this.handleSessionExpired();
        return false;
      }
    } catch (error) {
      console.error('Force refresh error:', error);
      return false;
    }
  }

  /**
   * Handle session error
   */
  private handleSessionError() {
    console.log('Handling session error - clearing auth state');
    const authStore = useAuthStore.getState();
    authStore.setSession(null);
    authStore.setSupabaseUser(null);
    authStore.setUser(null);
    
    // Redirect to login if not already there
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login?error=session_expired';
    }
  }

  /**
   * Handle session expiry
   */
  private handleSessionExpired() {
    console.log('Session expired - redirecting to login');
    this.handleSessionError();
  }

  /**
   * Cleanup timers
   */
  cleanup() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Check if session is valid before making API calls
   */
  async ensureValidSession(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      this.handleSessionExpired();
      return false;
    }

    // Check if session is close to expiry and refresh if needed
    const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : null;
    const now = new Date();
    
    if (expiresAt && (expiresAt.getTime() - now.getTime()) < SESSION_EXPIRE_WARNING) {
      return await this.forceRefresh();
    }

    return true;
  }
}

// Singleton instance
export const sessionManager = new SessionManager();

// Export function to be used in React Query error handling
export async function handleQueryError(error: any): Promise<boolean> {
  // Check if it's a 401/403 error which might indicate session expiry
  if (error?.status === 401 || error?.status === 403 || 
      error?.message?.includes('JWT') || error?.message?.includes('expired')) {
    console.log('Detected potential session expiry in query error:', error);
    return await sessionManager.forceRefresh();
  }
  return false;
}

// Export function for proactive session validation before queries
export async function ensureValidSessionForQuery(): Promise<boolean> {
  return await sessionManager.ensureValidSession();
}