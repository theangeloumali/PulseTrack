'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Loader2, Mail, CheckCircle } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';

function VerifyEmailContent() {
	const [token, setToken] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const [isVerified, setIsVerified] = useState(false);

	const { verifyEmailAndCreateUser } = useAuth();
	const router = useRouter();
	const searchParams = useSearchParams();
	const { supabaseUser } = useAuth();
	const email = supabaseUser?.email;

	const handleVerification = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError('');

		if (!token || token.length !== 6) {
			setError('Please enter a valid 6-digit verification code');
			setIsLoading(false);
			return;
		}

		try {
			const { error } = await verifyEmailAndCreateUser({ token, email });

			if (error) {
				setError(error.message);
			} else {
				setIsVerified(true);
				// Redirect to dashboard after successful verification and user creation
				setTimeout(() => {
					router.push('/dashboard');
				}, 2000);
			}
		} catch (err) {
			setError('An unexpected error occurred during verification');
		} finally {
			setIsLoading(false);
		}
	};

	const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value.replace(/\D/g, '').slice(0, 6); // Only digits, max 6
		setToken(value);
	};

	useEffect(() => {
		const tokenHash = searchParams.get('token_hash');
		const type = searchParams.get('type');

		// This effect handles the automatic verification when the user clicks the email link.
		if (tokenHash && type === 'email') {
			setIsLoading(true);
			setError('');

			verifyEmailAndCreateUser({ tokenHash })
				.then(({ error }) => {
					if (error) {
						setError(error.message || 'Email verification failed. Please try again.');
					} else {
						setIsVerified(true);
						// Redirect to dashboard after successful verification
						setTimeout(() => {
							router.push('/dashboard');
						}, 2000);
					}
				})
				.catch((err) => {
					setError('An unexpected error occurred during verification.');
					console.error(err);
				})
				.finally(() => {
					setIsLoading(false);
				});
		}
		// The dependency array is simplified to avoid re-running the effect unnecessarily.
	}, [searchParams, verifyEmailAndCreateUser, router]);

	if (isVerified) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
				<div className='max-w-md w-full space-y-8'>
					<Card>
						<CardHeader className='text-center'>
							<div className='mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100'>
								<CheckCircle className='h-6 w-6 text-green-600' />
							</div>
							<CardTitle className='text-green-800'>Email Verified!</CardTitle>
							<CardDescription>Your email has been verified and your account has been set up. Redirecting to dashboard...</CardDescription>
						</CardHeader>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
			<div className='max-w-md w-full space-y-8'>
				<div className='text-center'>
					<div className='mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100'>
						<Mail className='h-6 w-6 text-blue-600' />
					</div>
					<h2 className='mt-6 text-3xl font-extrabold text-gray-900'>Verify your email</h2>
					<p className='mt-2 text-sm text-gray-600'>
						We've sent a 6-digit verification code to <span className='font-medium'>{email}</span>
					</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Enter verification code</CardTitle>
						<CardDescription>Check your email and enter the 6-digit code we sent you</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleVerification} className='space-y-6'>
							{error && <div className='text-red-600 text-sm text-center bg-red-50 p-3 rounded'>{error}</div>}

							<div>
								<Label htmlFor='token'>Verification Code</Label>
								<Input id='token' type='text' placeholder='000000' value={token} onChange={handleTokenChange} className='text-center text-2xl font-mono tracking-widest' maxLength={6} required />
								<p className='text-xs text-gray-500 mt-1'>Enter the 6-digit code from your email</p>
							</div>

							<Button type='submit' className='w-full' disabled={isLoading || token.length !== 6}>
								{isLoading ? (
									<>
										<Loader2 className='mr-2 h-4 w-4 animate-spin' />
										Verifying...
									</>
								) : (
									'Verify Email'
								)}
							</Button>
						</form>

						<div className='mt-6 text-center'>
							<p className='text-sm text-gray-600'>
								Didn't receive the code?{' '}
								<button
									className='font-medium text-indigo-600 hover:text-indigo-500'
									onClick={() => {
										// TODO: Implement resend functionality
										alert('Resend functionality coming soon');
									}}
								>
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
				<div className='min-h-screen flex items-center justify-center bg-gray-50'>
					<Loader2 className='h-8 w-8 animate-spin' />
				</div>
			}
		>
			<VerifyEmailContent />
		</Suspense>
	);
}
