'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/db';
import { useAuthStore } from '@/lib/stores/auth';
import { clearAuthState } from '@/lib/auth-utils';

interface TestResult {
  test: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

export default function AuthDiagnosticPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [logs, setLogs] = useState<string[]>([]);
  const [currentState, setCurrentState] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dbTestResults, setDbTestResults] = useState<any>(null);
  const [performanceResults, setPerformanceResults] = useState<any>(null);
  const authStore = useAuthStore();

  // Auto-refresh current state
  useEffect(() => {
    const updateCurrentState = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const { data: userData } = await supabase.auth.getUser();
      
      setCurrentState({
        supabaseSession: sessionData.session,
        supabaseUser: userData.user,
        authStore: authStore,
        localStorage: typeof window !== 'undefined' ? {
          'sb-auth-token': localStorage.getItem('sb-bqqosmjptqtivinrcfhn-auth-token'),
          'currentUser': localStorage.getItem('currentUser'),
        } : {},
        cookies: typeof window !== 'undefined' ? document.cookie : '',
        timestamp: new Date().toISOString(),
      });
    };

    updateCurrentState();
    const interval = setInterval(updateCurrentState, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [authStore]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]); // Keep last 50 logs
  };

  const runAllTests = async () => {
    setLoading(true);
    addLog('Starting comprehensive diagnostics...');
    
    const testResults: TestResult[] = [];

    try {
      // Environment test
      addLog('Testing environment variables...');
      const envTest = {
        test: 'Environment Variables',
        success: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        data: {
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        },
        timestamp: new Date().toISOString(),
      };
      testResults.push(envTest);
      addLog(`Environment test: ${envTest.success ? 'PASS' : 'FAIL'}`);

      // Connection test
      addLog('Testing Supabase connection...');
      try {
        const startTime = Date.now();
        const { data, error } = await supabase.from('users').select('count').limit(1);
        const endTime = Date.now();
        
        const connectionTest = {
          test: 'Supabase Connection',
          success: !error,
          data: {
            responseTime: `${endTime - startTime}ms`,
            hasData: !!data,
          },
          error: error?.message,
          timestamp: new Date().toISOString(),
        };
        testResults.push(connectionTest);
        addLog(`Connection test: ${connectionTest.success ? 'PASS' : 'FAIL'} (${endTime - startTime}ms)`);
      } catch (error: any) {
        const connectionTest = {
          test: 'Supabase Connection',
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
        testResults.push(connectionTest);
        addLog(`Connection test: FAIL - ${error.message}`);
      }

      // Session test
      addLog('Testing authentication session...');
      try {
        const { data, error } = await supabase.auth.getSession();
        const sessionTest = {
          test: 'Authentication Session',
          success: !!data.session && !error,
          data: {
            hasSession: !!data.session,
            hasUser: !!data.session?.user,
            userId: data.session?.user?.id,
            userEmail: data.session?.user?.email,
            expiresAt: data.session?.expires_at,
          },
          error: error?.message,
          timestamp: new Date().toISOString(),
        };
        testResults.push(sessionTest);
        addLog(`Session test: ${sessionTest.success ? 'PASS' : 'FAIL'}`);
      } catch (error: any) {
        const sessionTest = {
          test: 'Authentication Session',
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
        testResults.push(sessionTest);
        addLog(`Session test: FAIL - ${error.message}`);
      }

      // LocalStorage test
      if (typeof window !== 'undefined') {
        addLog('Testing local storage...');
        const authKeys = [
          'sb-bqqosmjptqtivinrcfhn-auth-token',
          'supabase.auth.token',
          'currentUser'
        ];
        
        const localStorageData: any = {};
        authKeys.forEach(key => {
          try {
            const value = localStorage.getItem(key);
            localStorageData[key] = value ? 'exists' : 'not found';
          } catch (error) {
            localStorageData[key] = `error: ${error}`;
          }
        });

        const localStorageTest = {
          test: 'Local Storage',
          success: Object.values(localStorageData).some(v => v === 'exists'),
          data: localStorageData,
          timestamp: new Date().toISOString(),
        };
        testResults.push(localStorageTest);
        addLog(`Local storage test: ${localStorageTest.success ? 'PASS' : 'FAIL'}`);
      }

      // Cookies test
      if (typeof window !== 'undefined') {
        addLog('Testing cookies...');
        const cookieData = {
          allCookies: document.cookie,
          hasSupabaseCookies: document.cookie.includes('sb-'),
          cookieCount: document.cookie.split(';').length,
        };
        
        const cookiesTest = {
          test: 'Cookies',
          success: cookieData.hasSupabaseCookies,
          data: cookieData,
          timestamp: new Date().toISOString(),
        };
        testResults.push(cookiesTest);
        addLog(`Cookies test: ${cookiesTest.success ? 'PASS' : 'FAIL'}`);
      }

      // Auth Store test
      addLog('Testing auth store state...');
      const authStoreTest = {
        test: 'Auth Store State',
        success: !!authStore.user,
        data: {
          hasUser: !!authStore.user,
          userId: authStore.user?.id,
          userEmail: authStore.user?.email,
          hasSupabaseUser: !!authStore.supabaseUser,
        },
        timestamp: new Date().toISOString(),
      };
      testResults.push(authStoreTest);
      addLog(`Auth store test: ${authStoreTest.success ? 'PASS' : 'FAIL'}`);

      setResults(testResults);
      addLog(`Diagnostics completed. ${testResults.filter(r => r.success).length}/${testResults.length} tests passed.`);
    } catch (error: any) {
      addLog(`Diagnostics failed: ${error.message}`);
      testResults.push({
        test: 'Overall Diagnostic',
        success: false,
        error: error?.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      setResults(testResults);
    } finally {
      setLoading(false);
    }
  };

  const runDatabaseTests = async () => {
    addLog('Running database tests...');
    setLoading(true);
    
    try {
      const testResults: any = {};
      
      // Test basic connection
      const { data: connectionData, error: connectionError } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      testResults.connection = {
        success: !connectionError,
        error: connectionError?.message,
        data: connectionData,
      };

      // Test user operations
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .limit(5);
        
        testResults.userQuery = {
          success: !userError,
          error: userError?.message,
          count: userData?.length || 0,
        };
      } catch (error: any) {
        testResults.userQuery = {
          success: false,
          error: error.message,
        };
      }

      // Test projects
      try {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .limit(5);
        
        testResults.projectQuery = {
          success: !projectError,
          error: projectError?.message,
          count: projectData?.length || 0,
        };
      } catch (error: any) {
        testResults.projectQuery = {
          success: false,
          error: error.message,
        };
      }

      // Test tickets
      try {
        const { data: ticketData, error: ticketError } = await supabase
          .from('tickets')
          .select('*')
          .limit(5);
        
        testResults.ticketQuery = {
          success: !ticketError,
          error: ticketError?.message,
          count: ticketData?.length || 0,
        };
      } catch (error: any) {
        testResults.ticketQuery = {
          success: false,
          error: error.message,
        };
      }

      setDbTestResults(testResults);
      addLog('Database tests completed');
    } catch (error: any) {
      addLog(`Database tests failed: ${error.message}`);
      setDbTestResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const runPerformanceTests = async () => {
    addLog('Running performance tests...');
    setLoading(true);
    
    try {
      const results: any = {};
      
      // Test query performance
      const queries = [
        { name: 'Users Query', query: () => supabase.from('users').select('*').limit(10) },
        { name: 'Projects Query', query: () => supabase.from('projects').select('*').limit(10) },
        { name: 'Tickets Query', query: () => supabase.from('tickets').select('*').limit(10) },
      ];

      for (const { name, query } of queries) {
        const startTime = Date.now();
        try {
          const { data, error } = await query();
          const endTime = Date.now();
          
          results[name] = {
            success: !error,
            responseTime: endTime - startTime,
            recordCount: data?.length || 0,
            error: error?.message,
          };
        } catch (error: any) {
          results[name] = {
            success: false,
            error: error.message,
            responseTime: Date.now() - startTime,
          };
        }
      }

      setPerformanceResults(results);
      addLog('Performance tests completed');
    } catch (error: any) {
      addLog(`Performance tests failed: ${error.message}`);
      setPerformanceResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const quickSignIn = async () => {
    if (!email || !password) {
      addLog('Email and password required for quick sign in');
      return;
    }

    addLog(`Attempting quick sign in for ${email}...`);
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        addLog(`Sign in failed: ${error.message}`);
      } else {
        addLog(`Sign in successful for ${data.user?.email}`);
      }
    } catch (error: any) {
      addLog(`Sign in error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearAuthStateAndReload = () => {
    addLog('Clearing auth state...');
    clearAuthState();
    supabase.auth.signOut();
    
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    
    addLog('Auth state cleared! Page will reload...');
    setTimeout(() => window.location.reload(), 1000);
  };

  const checkSession = async () => {
    addLog('Checking current session...');
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      addLog(`Session check failed: ${error.message}`);
    } else if (data.session) {
      addLog(`Session found for user: ${data.session.user.email}`);
    } else {
      addLog('No active session found');
    }
  };

  const initializeAuth = async () => {
    addLog('Initializing auth...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Don't set the supabase user directly in auth store, just log it
        addLog(`Auth initialized with existing session for: ${session.user.email}`);
      } else {
        addLog('No session found during auth initialization');
      }
    } catch (error: any) {
      addLog(`Auth initialization failed: ${error.message}`);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'connection', label: 'Connection' },
    { id: 'authentication', label: 'Authentication' },
    { id: 'database', label: 'Database' },
    { id: 'performance', label: 'Performance' },
    { id: 'debug', label: 'Debug Console' },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Authentication & System Diagnostics</h1>
      
      {/* Quick Actions */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={runAllTests}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Run All Tests'}
          </button>
          <button
            onClick={clearAuthStateAndReload}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Clear Auth State
          </button>
          <button
            onClick={checkSession}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Check Session
          </button>
          <button
            onClick={initializeAuth}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            Initialize Auth
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Status */}
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Current Status</h3>
              {currentState && (
                <div className="space-y-2 text-sm">
                  <div className={`p-2 rounded ${currentState.supabaseSession ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    Session: {currentState.supabaseSession ? 'Active' : 'None'}
                  </div>
                  <div className={`p-2 rounded ${currentState.authStore?.user ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    Auth Store: {currentState.authStore?.user ? 'Authenticated' : 'Not authenticated'}
                  </div>
                  <div className={`p-2 rounded ${currentState.localStorage['sb-auth-token'] ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    Local Storage: {currentState.localStorage['sb-auth-token'] ? 'Has token' : 'No token'}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Sign In */}
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Quick Sign In</h3>
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border rounded"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border rounded"
                />
                <button
                  onClick={quickSignIn}
                  disabled={loading || !email || !password}
                  className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>

          {/* Recent Test Results */}
          {results.length > 0 && (
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Recent Test Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {results.map((result, index) => (
                  <div key={index} className={`p-3 rounded border-l-4 ${result.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                    <div className="font-medium">{result.test}</div>
                    <div className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                      {result.success ? 'PASS' : 'FAIL'}
                    </div>
                    {result.error && (
                      <div className="text-xs text-red-500 mt-1">{result.error}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'connection' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Environment Variables</h3>
            <div className="space-y-2 text-sm">
              <div className={`p-2 rounded ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'bg-green-100' : 'bg-red-100'}`}>
                NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing'}
              </div>
              <div className={`p-2 rounded ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'bg-green-100' : 'bg-red-100'}`}>
                NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing'}
              </div>
              {process.env.NEXT_PUBLIC_SUPABASE_URL && (
                <div className="p-2 bg-gray-100 rounded">
                  URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'authentication' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Authentication State</h3>
            {currentState && (
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify({
                  supabaseSession: currentState.supabaseSession,
                  authStore: currentState.authStore,
                  localStorage: currentState.localStorage,
                }, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {activeTab === 'database' && (
        <div className="space-y-6">
          <div className="flex gap-2 mb-4">
            <button
              onClick={runDatabaseTests}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Run Database Tests
            </button>
          </div>

          {dbTestResults && (
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Database Test Results</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(dbTestResults, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="flex gap-2 mb-4">
            <button
              onClick={runPerformanceTests}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Run Performance Tests
            </button>
          </div>

          {performanceResults && (
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Performance Test Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(performanceResults).map(([name, result]: [string, any]) => (
                  <div key={name} className={`p-4 rounded border ${result.success ? 'border-green-500' : 'border-red-500'}`}>
                    <div className="font-medium">{name}</div>
                    <div className="text-sm text-gray-600">
                      Response Time: {result.responseTime}ms
                    </div>
                    {result.recordCount !== undefined && (
                      <div className="text-sm text-gray-600">
                        Records: {result.recordCount}
                      </div>
                    )}
                    {result.error && (
                      <div className="text-sm text-red-500">{result.error}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'debug' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Debug Console</h3>
            <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-64 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
              {logs.length === 0 && <div>No logs yet. Run some tests to see debug output...</div>}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Real-time State</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-64">
              {JSON.stringify(currentState, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Common Issues & Solutions */}
      <div className="mt-8 bg-yellow-50 p-6 rounded-lg border border-yellow-200">
        <h3 className="text-lg font-semibold mb-4 text-yellow-800">Common Issues & Solutions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-yellow-800">Invalid Refresh Token:</h4>
            <p className="text-yellow-700">Clear auth state and try signing in again</p>
          </div>
          <div>
            <h4 className="font-medium text-yellow-800">Session not persisting:</h4>
            <p className="text-yellow-700">Check if cookies are blocked or cleared</p>
          </div>
          <div>
            <h4 className="font-medium text-yellow-800">Multiple instances:</h4>
            <p className="text-yellow-700">Make sure only one dev server is running</p>
          </div>
          <div>
            <h4 className="font-medium text-yellow-800">Environment variables:</h4>
            <p className="text-yellow-700">Ensure .env.local has correct Supabase credentials</p>
          </div>
        </div>
      </div>
    </div>
  );
}
