'use client';

import {useState, useEffect, Suspense} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {Button} from '@workspace/ui/components/button';
import {Input} from '@workspace/ui/components/input';
import {Label} from '@workspace/ui/components/label';
import {useAuthStore} from '@/lib/stores/auth';
import {Eye, EyeOff, Loader2, CheckCircle2, ArrowRight} from 'lucide-react';
import {supabase} from '@/lib/db';
import {motion, AnimatePresence, Variants} from 'framer-motion';

const isDev = false;

const IN_APP_FEATURES = [
  'Kinetic drag-and-drop project boards',
  'Atomic time tracking with zero cognitive overhead',
  'Deterministic billing and automated invoicing',
  'Strict role-based tenancy for enterprise security',
];

const containerVariants: Variants = {
  hidden: {opacity: 0},
  visible: {
    opacity: 1,
    transition: {staggerChildren: 0.1, delayChildren: 0.1},
  },
};

const itemVariants: Variants = {
  hidden: {opacity: 0, y: 20},
  visible: {opacity: 1, y: 0, transition: {duration: 0.6, ease: [0.16, 1, 0.3, 1]}},
};

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
        const {data, error} = await supabase.auth.exchangeCodeForSession(authCode);
        if (error) {
          setError('Invalid or expired reset link');
          setIsLoading(false);
          return;
        }

        if (data.user) {
          router.push('/reset-password');
        } else {
          setError('Invalid reset link');
          setIsLoading(false);
        }
      } catch (err) {
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
        router.push('/dashboard');
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
    <div className="flex min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/20 selection:text-primary">
      {/* BRAND & APP SHOWCASE (Desktop Only) */}
      <div className="hidden lg:flex w-1/2 bg-muted relative items-center justify-center p-12 border-r border-border overflow-hidden">
        {/* Abstract Background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:32px_32px] opacity-20 pointer-events-none" />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 max-w-xl flex flex-col items-start gap-10">
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-full py-1.5 px-4 text-primary text-sm font-bold tracking-wide">
            PulseTrack V3 Architecture
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl xl:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Manage workflows with absolute precision.
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg text-muted-foreground leading-relaxed">
            A breathtakingly fast, scalable platform for ticketing, time tracking, and professional
            billing. Engineered strictly for elite operational teams.
          </motion.p>

          <motion.div variants={containerVariants} className="flex flex-col gap-5 mt-4">
            {IN_APP_FEATURES.map((feature, i) => (
              <motion.div variants={itemVariants} key={i} className="flex items-center gap-4 group">
                <div className="h-8 w-8 rounded-full bg-background border border-border shadow-sm flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:-rotate-6 transition-transform">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
                <span className="text-base font-medium text-foreground">{feature}</span>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mt-8 pt-8 border-t border-border w-full flex items-center gap-4">
            <div className="h-12 w-12 rounded-full border border-border bg-background overflow-hidden relative shrink-0">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                alt="Michael"
                className="object-cover w-full h-full"
              />
            </div>
            <div>
              <p className="text-sm font-medium italic text-foreground leading-relaxed">
                "The speed of the UI is unmatched. Drag-and-drop combined with fast time tracking is
                a game changer."
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-bold">
                MICHAEL CHEN — PRINCIPAL ENGINEER
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* LOGIN FORM */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-16 xl:px-24 bg-background z-10 shadow-2xl lg:shadow-none">
        <motion.div
          initial={{opacity: 0, x: 20}}
          animate={{opacity: 1, x: 0}}
          transition={{duration: 0.6, ease: [0.16, 1, 0.3, 1]}}
          className="w-full max-w-sm mx-auto flex flex-col">
          {/* Mobile Only Header inside Form */}
          <div className="flex flex-col mb-10">
            <Link
              href="/"
              className="inline-flex items-center gap-3 group shrink-0 outline-none w-max mb-8">
              <motion.div
                whileHover={{rotate: 10, scale: 1.05}}
                className="h-10 w-10 bg-muted border border-border flex items-center justify-center rounded-xl shrink-0">
                <Image
                  src="/app-logo.png"
                  alt="PulseTrack Logo"
                  width={24}
                  height={24}
                  className="rounded"
                />
              </motion.div>
              <h2 className="text-xl font-bold tracking-tight text-foreground transition-colors">
                PulseTrack
              </h2>
            </Link>

            <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-2">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link
                href="/signup"
                className="font-bold text-primary hover:text-primary/80 transition-colors">
                Create workspace <ArrowRight className="inline w-3 h-3 ml-0.5" />
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{opacity: 0, height: 0, scale: 0.95}}
                  animate={{opacity: 1, height: 'auto', scale: 1}}
                  exit={{opacity: 0, height: 0, scale: 0.95}}
                  className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm font-medium">
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-2 relative">
              <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full text-foreground bg-background border border-border outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all rounded-lg px-4 py-6"
              />
            </div>

            <div className="flex flex-col gap-2 relative">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-bold text-primary hover:text-primary/80 transition-colors">
                  Forgot password?
                </Link>
              </div>

              <div className="relative flex items-center">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                  className="w-full text-foreground bg-background border border-border outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all rounded-lg px-4 py-6 font-mono pr-12"
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 bottom-0 px-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors outline-none"
                  onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <motion.div whileHover={{scale: 1.02}} whileTap={{scale: 0.98}} className="mt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-xl text-base font-bold shadow-sm transition-all flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Sign in to Dashboard'
                )}
              </Button>
            </motion.div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
      <LoginContent />
    </Suspense>
  );
}
