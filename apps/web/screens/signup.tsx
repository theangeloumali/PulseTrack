'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {Button} from '@workspace/ui/components/button';
import {Input} from '@workspace/ui/components/input';
import {Label} from '@workspace/ui/components/label';
import {useAuthStore} from '@/lib/stores/auth';
import {generateSlug} from '@/lib/utils';
import {validatePassword} from '@/lib/validation';
import {Eye, EyeOff, Loader2, CheckCircle2, ArrowRight} from 'lucide-react';
import {motion, AnimatePresence, Variants} from 'framer-motion';

const IN_APP_FEATURES = [
  'Immediate workspace initialization',
  'Assign complex roles strictly per project',
  'Immutable ledgers for client accountability',
  'Unmetered time tracking natively integrated',
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

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    companyName: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const {signUp} = useAuthStore();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error!);
      setIsLoading(false);
      return;
    }

    try {
      const {error} = await signUp(formData.email, formData.password, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        companyName: formData.companyName,
        companySlug: generateSlug(formData.companyName),
        email: formData.email,
        role: 'company_admin',
      });

      if (error) {
        setError(error.message);
      } else {
        // Store signup metadata in sessionStorage to avoid PII in URL params
        sessionStorage.setItem(
          'pendingSignupData',
          JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
            companyName: formData.companyName,
            companySlug: generateSlug(formData.companyName),
            role: 'company_admin',
          }),
        );
        router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/20 selection:text-primary">
      {/* BRAND SHOWCASE (Desktop Only) */}
      <div className="hidden lg:flex w-5/12 bg-muted relative items-center justify-center p-12 border-r border-border overflow-hidden">
        {/* Abstract Background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:32px_32px] opacity-20 pointer-events-none" />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 max-w-lg flex flex-col items-start gap-8">
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-full py-1.5 px-4 text-primary text-sm font-bold tracking-wide">
            Enterprise Grade Deployment
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Architect your organization's future.
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg text-muted-foreground leading-relaxed">
            Stop managing disjointed tools. Deploy your PulseTrack workspace and establish immediate
            operational superiority over internal workflows and client billing.
          </motion.p>

          <motion.div variants={containerVariants} className="flex flex-col gap-4 mt-2">
            {IN_APP_FEATURES.map((feature, i) => (
              <motion.div variants={itemVariants} key={i} className="flex items-center gap-4 group">
                <div className="h-7 w-7 rounded-md bg-background border border-border shadow-sm flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{feature}</span>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mt-8 pt-8 border-t border-border w-full flex items-center gap-4">
            <div className="h-10 w-10 rounded-full border border-border bg-background overflow-hidden relative shrink-0">
              <img
                src="https://randomuser.me/api/portraits/women/44.jpg"
                alt="Sarah"
                className="object-cover w-full h-full"
              />
            </div>
            <div>
              <p className="text-sm font-medium italic text-foreground leading-relaxed">
                "We discarded three disparate tools immediately after initializing our PulseTrack
                workspace."
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 font-bold tracking-wider">
                SARAH JOHNSON — OPERATIONS DIRECTOR
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* SIGNUP FORM */}
      <div className="w-full lg:w-7/12 flex flex-col justify-center px-6 py-12 sm:px-16 xl:px-24 bg-background z-10 shadow-2xl lg:shadow-none min-h-screen overflow-y-auto">
        <motion.div
          initial={{opacity: 0, x: -20}}
          animate={{opacity: 1, x: 0}}
          transition={{duration: 0.6, ease: [0.16, 1, 0.3, 1]}}
          className="w-full max-w-xl mx-auto flex flex-col py-10">
          {/* Header */}
          <div className="flex flex-col mb-10 text-center lg:text-left items-center lg:items-start">
            <Link
              href="/"
              className="inline-flex items-center gap-3 group shrink-0 outline-none w-max mb-8">
              <motion.div
                whileHover={{rotate: -10, scale: 1.05}}
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
              Initialize Workspace
            </h1>
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-bold text-primary hover:text-primary/80 transition-colors">
                Sign in to dashboard <ArrowRight className="inline w-3 h-3 ml-0.5" />
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{opacity: 0, height: 0, scale: 0.95}}
                  animate={{opacity: 1, height: 'auto', scale: 1}}
                  exit={{opacity: 0, height: 0, scale: 0.95}}
                  className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm font-medium overflow-hidden">
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2 relative">
                <Label htmlFor="firstName" className="text-sm font-semibold text-foreground">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="John"
                  className="w-full text-foreground bg-background border border-border outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all rounded-lg px-4 py-5"
                />
              </div>
              <div className="flex flex-col gap-2 relative">
                <Label htmlFor="lastName" className="text-sm font-semibold text-foreground">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Doe"
                  className="w-full text-foreground bg-background border border-border outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all rounded-lg px-4 py-5"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 relative">
              <Label htmlFor="companyName" className="text-sm font-semibold text-foreground">
                Organization Name
              </Label>
              <Input
                id="companyName"
                name="companyName"
                type="text"
                required
                value={formData.companyName}
                onChange={handleChange}
                placeholder="Acme Corporation"
                className="w-full text-foreground bg-background border border-border outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all rounded-lg px-4 py-5"
              />
              <p className="text-xs text-muted-foreground/80 font-medium">
                This generates your deterministic organizational slug structure.
              </p>
            </div>

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
                value={formData.email}
                onChange={handleChange}
                placeholder="john.doe@organization.com"
                className="w-full text-foreground bg-background border border-border outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all rounded-lg px-4 py-5"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2 relative">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                    Password
                  </Label>
                </div>
                <div className="relative flex items-center">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                    className="w-full text-foreground bg-background border border-border outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all rounded-lg px-4 py-5 font-mono pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 bottom-0 px-3 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors outline-none"
                    onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 relative">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-sm font-semibold text-foreground">
                    Confirm
                  </Label>
                </div>
                <div className="relative flex items-center">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                    className="w-full text-foreground bg-background border border-border outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all rounded-lg px-4 py-5 font-mono pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 bottom-0 px-3 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors outline-none"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <motion.div whileHover={{scale: 1.02}} whileTap={{scale: 0.98}} className="mt-5">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-14 rounded-xl text-base font-bold shadow-sm transition-all flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Initializing Workspace...
                  </>
                ) : (
                  'Deploy PulseTrack Workspace'
                )}
              </Button>
            </motion.div>

            <p className="text-xs text-muted-foreground/80 font-medium text-center md:text-left mt-2 leading-relaxed">
              By initializing your workspace, you accept our strict{' '}
              <Link href="/terms" className="text-primary hover:text-primary/80 transition-colors">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                href="/privacy"
                className="text-primary hover:text-primary/80 transition-colors">
                Data Protocol
              </Link>
              , designed specifically for enterprise security and operational compliance.
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
