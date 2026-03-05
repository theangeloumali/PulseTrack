'use client';

import {useState, useEffect, Suspense, useCallback, useRef} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {Button} from '@workspace/ui/components/button';
import {Input} from '@workspace/ui/components/input';
import {Loader2, Mail, CheckCircle2, AlertCircle, ArrowRight} from 'lucide-react';
import {useAuth} from '@/lib/hooks/useAuth';
import {Progress} from '@workspace/ui/components/progress';
import {motion, AnimatePresence, Variants} from 'framer-motion';
import Link from 'next/link';

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

  const isSubmittingRef = useRef(false);
  const lastSubmitTimeRef = useRef(0);

  const {verifyEmailAndCreateUser} = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {supabaseUser} = useAuth();
  const email = searchParams.get('email') || supabaseUser?.email || '';

  // Belt-and-suspenders: read signup data from URL params (set by signup.tsx)
  const signupData = {
    firstName: searchParams.get('firstName') || '',
    lastName: searchParams.get('lastName') || '',
    companyName: searchParams.get('companyName') || '',
    companySlug: searchParams.get('companySlug') || '',
    role: (searchParams.get('role') || 'company_admin') as 'company_admin' | 'manager' | 'user',
  };
  const hasSignupData = !!(signupData.companyName && signupData.companySlug);

  const redirectToDashboard = useCallback(() => {
    setVerificationStep('redirecting');
    // Hard redirect avoids the React re-mount cycle during soft navigation
    // that causes the verification form to briefly flash before dashboard loads.
    window.location.replace('/dashboard');
  }, []);

  const handleVerification = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const correlationId = `verify-ui-${crypto.randomUUID()}`;

      const now = Date.now();
      if (isSubmittingRef.current || now - lastSubmitTimeRef.current < 1000) {
        return;
      }

      if (!token || token.length !== 8) {
        setError('Please enter a valid 8-digit verification code');
        return;
      }

      isSubmittingRef.current = true;
      lastSubmitTimeRef.current = now;
      setIsLoading(true);
      setError('');
      setVerificationStep('verifying');

      try {
        console.log(`[signup-verify:${correlationId}] Manual verification submitted`, {
          hasEmail: !!email,
          tokenLength: token.length,
        });

        const {error} = await verifyEmailAndCreateUser({
          token,
          email,
          correlationId,
          ...(hasSignupData ? {signupData} : {}),
        });

        if (error) {
          setError(error.message);
          setVerificationStep('idle');

          if (error.message.includes('Invalid') && retryCount < 2) {
            setIsRetrying(true);
            setRetryCount((prev) => prev + 1);
            setTimeout(() => {
              setIsRetrying(false);
              handleVerification(e);
            }, 1500);
          }
        } else {
          setVerificationStep('creating');
          setIsVerified(true);

          setTimeout(() => {
            redirectToDashboard();
          }, 1500);
        }
      } catch (err) {
        setError('An unexpected error occurred. Please try again.');
        setVerificationStep('idle');
      } finally {
        setIsLoading(false);
        isSubmittingRef.current = false;
      }
    },
    [token, email, retryCount, verifyEmailAndCreateUser, redirectToDashboard],
  );

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 8); // Only digits, max 8
    setToken(value);
  };

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');

    if (tokenHash && type === 'email' && !isSubmittingRef.current) {
      const correlationId = `verify-link-${crypto.randomUUID()}`;
      isSubmittingRef.current = true;
      setIsLoading(true);
      setError('');
      setVerificationStep('verifying');

      console.log(`[signup-verify:${correlationId}] Auto verification started from email link`);

      verifyEmailAndCreateUser({
        tokenHash,
        email,
        correlationId,
        ...(hasSignupData ? {signupData} : {}),
      })
        .then(async ({error}) => {
          if (error) {
            setError(error.message || 'Email verification failed. Please try again.');
            setVerificationStep('idle');
          } else {
            setVerificationStep('creating');
            setIsVerified(true);

            setTimeout(() => {
              redirectToDashboard();
            }, 1500);
          }
        })
        .catch((err) => {
          setError('An unexpected error occurred during verification.');
          setVerificationStep('idle');
        })
        .finally(() => {
          setIsLoading(false);
          isSubmittingRef.current = false;
        });
    }
  }, [searchParams, verifyEmailAndCreateUser, redirectToDashboard, email]);

  // Framer Motion Variants
  const cardVariants: Variants = {
    hidden: {opacity: 0, y: 20},
    visible: {opacity: 1, y: 0, transition: {duration: 0.6, ease: [0.16, 1, 0.3, 1]}},
  };

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground py-12 px-4 sm:px-6 selection:bg-primary/20">
        <motion.div
          initial={{opacity: 0, scale: 0.95}}
          animate={{opacity: 1, scale: 1}}
          transition={{duration: 0.5, ease: [0.16, 1, 0.3, 1]}}
          className="max-w-md w-full">
          <div className="bg-card border border-border shadow-xl rounded-3xl p-8 sm:p-10 flex flex-col items-center text-center">
            <motion.div
              initial={{scale: 0}}
              animate={{scale: 1}}
              transition={{type: 'spring', stiffness: 200, damping: 15, delay: 0.2}}
              className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </motion.div>

            <h2 className="text-2xl font-extrabold tracking-tight text-foreground mb-2">
              {verificationStep === 'creating' ? 'Authentication Complete' : 'System Initialized'}
            </h2>
            <p className="text-muted-foreground text-sm mb-8 leading-relaxed max-w-[250px]">
              {verificationStep === 'creating'
                ? "We've verified your identity. Provisioning your workspace."
                : 'Redirecting you to your enterprise dashboard.'}
            </p>

            <div className="w-full space-y-3">
              <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                <span className={verificationStep === 'creating' ? 'text-primary' : ''}>
                  Verified
                </span>
                <span
                  className={
                    verificationStep === 'creating'
                      ? 'text-primary'
                      : verificationStep === 'redirecting'
                        ? 'text-primary'
                        : ''
                  }>
                  Deploying
                </span>
                <span className={verificationStep === 'redirecting' ? 'text-primary' : ''}>
                  Routing
                </span>
              </div>
              <div className="h-2 w-full bg-muted overflow-hidden rounded-full">
                <motion.div
                  initial={{width: '33%'}}
                  animate={{width: verificationStep === 'creating' ? '66%' : '100%'}}
                  transition={{duration: 0.8, ease: 'easeInOut'}}
                  className="h-full bg-primary rounded-full relative">
                  <div className="absolute inset-0 bg-white/20 blur-sm w-full h-full animate-[shimmer_2s_infinite] -translate-x-full"></div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground py-12 px-4 sm:px-6 selection:bg-primary/20">
      <div className="max-w-md w-full space-y-8 absolute top-8 left-8 sm:left-12">
        <Link href="/" className="inline-flex items-center gap-2 group pb-2 outline-none">
          <ArrowRight className="h-4 w-4 rotate-180 text-muted-foreground group-hover:text-foreground transition-colors" />
          <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
            Return to platform
          </span>
        </Link>
      </div>

      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="max-w-md w-full">
        <div className="bg-card border border-border shadow-xl rounded-[2rem] p-8 sm:p-10 relative overflow-hidden">
          {/* Subtle bg glow */}
          <div className="absolute top-0 inset-x-0 h-[100px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

          <div className="text-center mb-8 relative z-10">
            <motion.div
              whileHover={{scale: 1.05}}
              className="mx-auto flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
              <Mail className="h-6 w-6 text-primary" />
            </motion.div>
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground mb-3">
              Security Checkpoint
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We've dispatched an <span className="font-bold text-foreground">8-digit</span> secure
              protocol code to{' '}
              <span className="font-bold text-foreground mt-1 px-2 py-1 bg-muted rounded-md border border-border inline-block">
                {email || 'your email'}
              </span>
            </p>
          </div>

          <form onSubmit={handleVerification} className="space-y-6 relative z-10 w-full">
            <AnimatePresence mode="popLayout">
              {error && (
                <motion.div
                  initial={{opacity: 0, y: -10, scale: 0.95}}
                  animate={{opacity: 1, y: 0, scale: 1}}
                  exit={{opacity: 0, scale: 0.95, height: 0}}
                  className="flex items-start gap-3 text-destructive text-sm bg-destructive/10 border border-destructive/20 p-3 rounded-xl font-medium">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              {isRetrying && (
                <motion.div
                  initial={{opacity: 0, y: -10, scale: 0.95}}
                  animate={{opacity: 1, y: 0, scale: 1}}
                  exit={{opacity: 0, scale: 0.95, height: 0}}
                  className="flex items-center gap-2 text-primary text-sm bg-primary/10 border border-primary/20 p-3 rounded-xl font-medium">
                  <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                  <span>Re-testing connection protocol...</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-3">
              <Input
                id="token"
                type="text"
                placeholder="• • • • • • • •"
                value={token}
                onChange={handleTokenChange}
                className="text-center text-3xl font-mono tracking-[0.5em] h-16 rounded-xl border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm placeholder:text-muted/50"
                maxLength={8}
                required
                disabled={isLoading}
                autoFocus
                autoComplete="off"
              />
              <p className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground text-center">
                Protocol Code (8 Digits)
              </p>
            </div>

            <motion.div whileHover={{scale: 1.02}} whileTap={{scale: 0.98}} className="mt-8">
              <Button
                type="submit"
                className="w-full h-14 rounded-xl font-bold border-none shadow-sm transition-all"
                disabled={isLoading || token.length !== 8 || isSubmittingRef.current}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {verificationStep === 'verifying' && 'Authenticating Hash...'}
                    {verificationStep === 'creating' && 'Generating Profile...'}
                    {verificationStep === 'idle' && 'Processing...'}
                  </span>
                ) : (
                  'Authorize Workspace Access'
                )}
              </Button>
            </motion.div>

            {retryCount > 0 && (
              <p className="text-xs text-center font-bold text-muted-foreground uppercase tracking-wider mt-4">
                Redial Attempt: {retryCount + 1} / 3
              </p>
            )}
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center relative z-10 flex flex-col items-center">
            <span className="text-sm font-medium text-muted-foreground mb-1">
              Didn't retrieve the protocol?
            </span>
            <button
              type="button"
              className="text-sm font-bold text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
              onClick={() => {
                alert('Systems operator alert: Email resend relay interface coming soon.');
              }}>
              Force resend sequence
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
      <VerifyEmailContent />
    </Suspense>
  );
}
