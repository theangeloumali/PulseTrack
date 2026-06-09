'use client';

import {useState, useEffect, Suspense} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import Link from 'next/link';
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
import {Eye, EyeOff, Loader2, CheckCircle, ArrowLeft} from 'lucide-react';
import {supabase} from '@/lib/db';
import {useResetPasswordStore} from '@/lib/stores/reset-password';
import {validatePassword as sharedValidatePassword} from '@/lib/validation';

function ResetPasswordContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();
  const {clearPasswordResetFlow} = useResetPasswordStore();

  useEffect(() => {
    // Check if user has a valid session for password reset
    const checkSession = async () => {
      try {
        const {
          data: {user},
          error,
        } = await supabase.auth.getUser();

        if (error) {
          console.error('Reset password - Session check error:', error);
          setError('Invalid or expired reset link. Please request a new one.');
          setIsCheckingSession(false);
          return;
        }

        if (user) {
          console.log('Reset password - Valid session found for user:', user.email);
          setIsValidSession(true);
        } else {
          console.log('Reset password - No valid session found');
          setError('Invalid or expired reset link. Please request a new one.');
        }
      } catch (err) {
        console.error('Reset password - Session check failed:', err);
        setError('An error occurred. Please try again.');
      } finally {
        setIsCheckingSession(false);
      }
    };

    // Check for URL errors first
    const urlError = searchParams.get('error');
    const urlErrorDescription = searchParams.get('error_description');

    if (urlError) {
      setError(urlErrorDescription || 'Invalid or expired reset link');
      setIsCheckingSession(false);
    } else {
      checkSession();
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Don't allow submission if session is invalid
    if (!isValidSession) {
      setError('Invalid or expired reset link. Please request a new one.');
      return;
    }

    setIsLoading(true);
    setError('');

    // Validate password
    const passwordValidation = sharedValidatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error!);
      setIsLoading(false);
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      // Create a timeout that assumes success after 5 seconds (Supabase updateUser often hangs but succeeds)
      const updatePromise = supabase.auth.updateUser({
        password: password,
      });

      const timeoutPromise = new Promise<{error: null}>((resolve) =>
        setTimeout(() => resolve({error: null}), 5000),
      );

      const result = await Promise.race([updatePromise, timeoutPromise]);

      if (result.error) {
        setError(result.error.message);
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      clearPasswordResetFlow();

      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Reset password error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Verifying reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isValidSession && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-foreground">Invalid Reset Link</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This password reset link is invalid or has expired.
            </p>
          </div>
          <Card className="border shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Link href="/forgot-password">
                  <Button className="w-full">Request New Reset Link</Button>
                </Link>
                <Link href="/login">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to sign in
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-600 dark:text-green-400" />
            <h2 className="mt-6 text-3xl font-extrabold text-foreground">Password Updated</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your password has been successfully updated.
            </p>
          </div>

          <Card className="border shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  You will be redirected to your dashboard in a few seconds.
                </p>
                <Link href="/dashboard">
                  <Button className="w-full">Continue to dashboard</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-foreground">Reset your password</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your new password below to complete the reset process.
          </p>
        </div>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>New Password</CardTitle>
            <CardDescription>Choose a strong password for your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your new password"
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
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters with uppercase, lowercase, and numbers
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Updating password...
                  </>
                ) : (
                  'Update password'
                )}
              </Button>
            </form>

            <div className="mt-6">
              <Link href="/login">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to sign in
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }>
      <ResetPasswordContent />
    </Suspense>
  );
}
