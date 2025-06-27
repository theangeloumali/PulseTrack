'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { useAuthStore } from '@/lib/stores/auth';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');

	const { signIn } = useAuthStore();
	const router = useRouter();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError('');

		try {
			const { error } = await signIn(email, password);

			if (error) {
				setError(error.message);
      } else {
        console.log('Login successful, redirecting to dashboard...');
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
		<div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
			<div className='max-w-md w-full space-y-8'>
				<div className='text-center'>
					<h2 className='mt-6 text-3xl font-extrabold text-gray-900'>Sign in to your account</h2>
					<p className='mt-2 text-sm text-gray-600'>
						Or{' '}
						<Link href='/signup' className='font-medium text-indigo-600 hover:text-indigo-500'>
							create a new account
						</Link>
					</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Welcome back</CardTitle>
						<CardDescription>Enter your credentials to access your workspace</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className='space-y-6'>
							{error && <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm'>{error}</div>}

							<div className='space-y-2'>
								<Label htmlFor='email'>Email address</Label>
								<Input id='email' name='email' type='email' autoComplete='email' required value={email} onChange={(e) => setEmail(e.target.value)} placeholder='Enter your email' />
							</div>

							<div className='space-y-2'>
								<Label htmlFor='password'>Password</Label>
								<div className='relative'>
									<Input id='password' name='password' type={showPassword ? 'text' : 'password'} autoComplete='current-password' required value={password} onChange={(e) => setPassword(e.target.value)} placeholder='Enter your password' />
									<button type='button' className='absolute inset-y-0 right-0 pr-3 flex items-center' onClick={() => setShowPassword(!showPassword)}>
										{showPassword ? <EyeOff className='h-4 w-4 text-gray-400' /> : <Eye className='h-4 w-4 text-gray-400' />}
									</button>
								</div>
							</div>

							<div className='flex items-center justify-between'>
								<div className='text-sm'>
									<Link href='/forgot-password' className='font-medium text-indigo-600 hover:text-indigo-500'>
										Forgot your password?
									</Link>
								</div>
							</div>

							<Button type='submit' className='w-full' disabled={isLoading}>
								{isLoading ? (
									<>
										<Loader2 className='h-4 w-4 animate-spin' />
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
