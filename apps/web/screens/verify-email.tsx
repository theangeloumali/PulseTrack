'use client';

import {useState, useEffect, Suspense, useCallback, useRef} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
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
import {Loader2, Mail, CheckCircle, AlertCircle} from 'lucide-react';
import {useAuth} from '@/lib/hooks/useAuth';
import {Progress} from '@workspace/ui/components/progress';

function VerifyEmailContent() {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [verificationStep, setVerificationStep] = useState<
    'idle' | 'verifying' | 'creating' | 'redirecting'
  >('idle');
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Refs for debouncing and preventing multiple submissions
  const isSubmittingRef = useRef(false);
  const lastSubmitTimeRef = useRef(0);

  const {verifyEmailAndCreateUser, recoverSession} = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {supabaseUser} = useAuth();
  const email = supabaseUser?.email;

  // Debounced verification handler
  const handleVerification = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Prevent rapid resubmissions
      const now = Date.now();
      if (isSubmittingRef.current || now - lastSubmitTimeRef.current < 1000) {
        console.log('⚠️ Verification already in progress or too soon after last attempt');
        return;
      }

      if (!token || token.length !== 6) {
        setError('Please enter a valid 6-digit verification code');
        return;
      }

      // Set submission state
      isSubmittingRef.current = true;
      lastSubmitTimeRef.current = now;
      setIsLoading(true);
      setError('');
      setVerificationStep('verifying');

      try {
        console.log('🔐 Starting email verification...');
        const {error} = await verifyEmailAndCreateUser({token, email});

        if (error) {
          console.error('❌ Verification error:', error.message);
          setError(error.message);
          setVerificationStep('idle');

          // Auto-retry for specific errors
          if (error.message.includes('Invalid') && retryCount < 2) {
            setIsRetrying(true);
            setRetryCount((prev) => prev + 1);
            setTimeout(() => {
              setIsRetrying(false);
              console.log('🔄 Retrying verification...');
              handleVerification(e);
            }, 1500);
          }
        } else {
          console.log('✅ Verification successful!');
          setVerificationStep('creating');
          setIsVerified(true);

          // Ensure session is properly recovered and persisted
          await recoverSession();

          // Give user feedback before redirecting
          setTimeout(() => {
            setVerificationStep('redirecting');
            router.push('/dashboard');
          }, 1500);
        }
      } catch (err) {
        console.error('💥 Unexpected error:', err);
        setError('An unexpected error occurred. Please try again.');
        setVerificationStep('idle');
      } finally {
        setIsLoading(false);
        isSubmittingRef.current = false;
      }
    },
    [token, email, retryCount, verifyEmailAndCreateUser, router],
  );

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6); // Only digits, max 6
    setToken(value);
  };

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');

    // This effect handles the automatic verification when the user clicks the email link.
    if (tokenHash && type === 'email' && !isSubmittingRef.current) {
      isSubmittingRef.current = true;
      setIsLoading(true);
      setError('');
      setVerificationStep('verifying');

      console.log('🔗 Processing email link verification...');

      verifyEmailAndCreateUser({tokenHash})
        .then(async ({error}) => {
          if (error) {
            console.error('❌ Email link verification error:', error.message);
            setError(error.message || 'Email verification failed. Please try again.');
            setVerificationStep('idle');
          } else {
            console.log('✅ Email link verification successful!');
            setVerificationStep('creating');
            setIsVerified(true);

            // Ensure session is properly recovered and persisted
            await recoverSession();

            // Give user feedback before redirecting
            setTimeout(() => {
              setVerificationStep('redirecting');
              router.push('/dashboard');
            }, 1500);
          }
        })
        .catch((err) => {
          console.error('💥 Unexpected error in email link verification:', err);
          setError('An unexpected error occurred during verification.');
          setVerificationStep('idle');
        })
        .finally(() => {
          setIsLoading(false);
          isSubmittingRef.current = false;
        });
    }
    // The dependency array is simplified to avoid re-running the effect unnecessarily.
  }, [searchParams, verifyEmailAndCreateUser, router]);

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-green-800">
                {verificationStep === 'creating' && 'Email Verified!'}
                {verificationStep === 'redirecting' && 'All Set!'}
              </CardTitle>
              <CardDescription>
                {verificationStep === 'creating' && 'Setting up your account...'}
                {verificationStep === 'redirecting' && 'Redirecting to your dashboard...'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-green-600" />
              </div>
              <Progress
                value={verificationStep === 'creating' ? 66 : 100}
                className="h-2 transition-all duration-500"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span
                  className={verificationStep === 'creating' ? 'text-green-600 font-medium' : ''}>
                  Verifying
                </span>
                <span
                  className={
                    verificationStep === 'creating' ? 'text-green-600 font-medium' : 'text-gray-400'
                  }>
                  Creating Account
                </span>
                <span
                  className={
                    verificationStep === 'redirecting'
                      ? 'text-green-600 font-medium'
                      : 'text-gray-400'
                  }>
                  Redirecting
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Verify your email</h2>
          <p className="mt-2 text-sm text-gray-600">
            We've sent a 6-digit verification code to <span className="font-medium">{email}</span>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Enter verification code</CardTitle>
            <CardDescription>
              Check your email and enter the 6-digit code we sent you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerification} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {isRetrying && (
                <div className="flex items-center gap-2 text-blue-600 text-sm bg-blue-50 p-3 rounded">
                  <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                  <span>Retrying verification...</span>
                </div>
              )}

              <div>
                <Label htmlFor="token">Verification Code</Label>
                <Input
                  id="token"
                  type="text"
                  placeholder="000000"
                  value={token}
                  onChange={handleTokenChange}
                  className="text-center text-2xl font-mono tracking-widest"
                  maxLength={6}
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">Enter the 6-digit code from your email</p>
              </div>

              <Button
                type="submit"
                className="w-full relative overflow-hidden"
                disabled={isLoading || token.length !== 6 || isSubmittingRef.current}>
                {isLoading && <div className="absolute inset-0 bg-primary/10 animate-pulse" />}
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {verificationStep === 'verifying' && 'Verifying code...'}
                    {verificationStep === 'creating' && 'Creating account...'}
                    {verificationStep === 'idle' && 'Processing...'}
                  </>
                ) : (
                  'Verify Email'
                )}
              </Button>

              {isLoading && (
                <Progress
                  value={verificationStep === 'verifying' ? 33 : 66}
                  className="h-1 transition-all duration-300"
                />
              )}

              {retryCount > 0 && (
                <p className="text-xs text-center text-gray-500">Attempt {retryCount + 1} of 3</p>
              )}
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Didn't receive the code?{' '}
                <button
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                  onClick={() => {
                    // TODO: Implement resend functionality
                    alert('Resend functionality coming soon');
                  }}>
                  Resend email
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }>
      <VerifyEmailContent />
    </Suspense>
  );
}
