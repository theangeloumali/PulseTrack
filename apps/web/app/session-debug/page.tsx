'use client';

import {useState, useEffect} from 'react';
import {createBrowserClient} from '@supabase/ssr';

export default function SessionDebugPage() {
  // Prevent access in production
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Page Not Available</h1>
          <p className="text-gray-600">This debug page is only available in development mode.</p>
        </div>
      </div>
    );
  }
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('SessionDebug - Checking session...');
        const {
          data: {session},
          error,
        } = await supabase.auth.getSession();

        setSessionInfo({
          session: session
            ? {
                user: {
                  id: session.user.id,
                  email: session.user.email,
                  created_at: session.user.created_at,
                  user_metadata: session.user.user_metadata,
                  app_metadata: session.user.app_metadata,
                },
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at,
              }
            : null,
          error: error?.message || null,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        setSessionInfo({
          error: error,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Also listen for auth state changes
    const {
      data: {subscription},
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('SessionDebug - Auth state change:', event, session?.user?.id);
      setSessionInfo((prev: any) => ({
        ...prev,
        authEvent: event,
        authSession: session
          ? {
              user: {
                id: session.user.id,
                email: session.user.email,
                user_metadata: session.user.user_metadata,
              },
            }
          : null,
        lastUpdate: new Date().toISOString(),
      }));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading session debug info...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Session Debug</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <pre className="text-sm overflow-auto">{JSON.stringify(sessionInfo, null, 2)}</pre>
        </div>

        <div className="mt-6 space-x-4">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Refresh
          </button>
          <button
            onClick={() => (window.location.href = '/auth/accept-invitation')}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Go to Accept Invitation
          </button>
          <button
            onClick={() => (window.location.href = '/login')}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}
