'use client';

import {useState, useEffect, Suspense} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {Button} from '@workspace/ui/components/button';
import {Input} from '@workspace/ui/components/input';
import {Label} from '@workspace/ui/components/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import {useAuthStore} from '@/lib/stores/auth';
import {Eye, EyeOff, Loader2} from 'lucide-react';
import {supabase} from '@/lib/db';

const isDev = false;

function LoginContent() {
  const [email, setEmail] = useState(isDev ? 'christianangeloumaliofficial@gmail.com' : '');
  const [password, setPassword] = useState(isDev ? '@Testing123' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const {signIn} = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');
  const authCode = searchParams.get('code');

  useEffect(() => {
    if (urlError) {
      setError(`Redirect error: ${urlError}`);
    }
  }, [urlError]);

  useEffect(() => {
    // Handle password reset auth code
    const handlePasswordResetCode = async () => {
      if (!authCode) return;

      console.log('Login - Detected auth code, checking if password reset flow');
      setIsLoading(true);

      try {
        // Exchange the code for a session
        const {data, error} = await supabase.auth.exchangeCodeForSession(authCode);

        if (error) {
          console.error('Login - Code exchange error:', error);
          setError('Invalid or expired reset link');
          setIsLoading(false);
          return;
        }

        if (data.user) {
          console.log('Login - Code exchange successful, redirecting to reset password');
          // Successfully exchanged code for session, redirect to reset password
          router.push('/reset-password');
        } else {
          setError('Invalid reset link');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Login - Code exchange failed:', err);
        setError('An error occurred while processing the reset link');
        setIsLoading(false);
      }
    };

    handlePasswordResetCode();
  }, [authCode, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const {error} = await signIn(email, password);

      if (error) {
        setError(error.message);
      } else {
        // Login successful, redirecting to dashboard
        // Use a combination approach: first try client-side, then fallback to server-side
        router.push('/dashboard');
        // As a backup, force reload after a short delay if client-side navigation fails
        setTimeout(() => {
          if (window.location.pathname === '/login') {
            window.location.href = '/dashboard';
          }
        }, 500);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 relative">
              <Image
                src="/pulse/app-logo.png"
                alt="PulseTrack Logo"
                width={64}
                height={64}
                className="rounded-xl"
              />
            </div>
          </div>
          <h2 className="mt-2 text-3xl font-extrabold text-foreground">Sign in to your account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Or{' '}
            <Link href="/signup" className="font-medium text-primary hover:text-primary/80">
              create a new account
            </Link>
          </p>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Enter your credentials to access your workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Link
                    href="/forgot-password"
                    className="font-medium text-primary hover:text-primary/80">
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }>
      <LoginContent />
    </Suspense>
  );
}
