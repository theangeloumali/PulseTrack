'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { supabase } from '@/lib/db';
import { useResetPasswordStore } from '@/lib/stores/reset-password';

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [message, setMessage] = useState('');
	const [error, setError] = useState('');
	const [isSubmitted, setIsSubmitted] = useState(false);
	
	const { setPasswordResetFlow } = useResetPasswordStore();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError('');
		setMessage('');

		try {
			const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${siteUrl}/auth/callback/recovery`,
			});

			if (error) {
				setError(error.message);
			} else {
				// Set the password reset flow flag in store
				setPasswordResetFlow(email);
				setMessage('Check your email for a password reset link');
				setIsSubmitted(true);
			}
		} catch (err) {
			setError('An unexpected error occurred');
		} finally {
			setIsLoading(false);
		}
	};

	if (isSubmitted) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
				<div className='max-w-md w-full space-y-8'>
					<div className='text-center'>
						<Mail className='mx-auto h-12 w-12 text-indigo-600' />
						<h2 className='mt-6 text-3xl font-extrabold text-gray-900'>Check your email</h2>
						<p className='mt-2 text-sm text-gray-600'>
							We've sent a password reset link to <strong>{email}</strong>
						</p>
					</div>

					<Card className='bg-white border border-gray-200 shadow-sm'>
						<CardContent className='bg-white pt-6'>
							<div className='text-center space-y-4'>
								<p className='text-sm text-gray-600'>
									Didn't receive the email? Check your spam folder or try again.
								</p>
								<div className='flex flex-col space-y-2'>
									<Button
										onClick={() => {
											setIsSubmitted(false);
											setMessage('');
											setError('');
										}}
										variant='outline'
										className='w-full'
									>
										Try again
									</Button>
									<Link href='/login'>
										<Button variant='ghost' className='w-full'>
											<ArrowLeft className='h-4 w-4 mr-2' />
											Back to sign in
										</Button>
									</Link>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
			<div className='max-w-md w-full space-y-8'>
				<div className='text-center'>
					<h2 className='mt-6 text-3xl font-extrabold text-gray-900'>Forgot your password?</h2>
					<p className='mt-2 text-sm text-gray-600'>
						No worries! Enter your email address and we'll send you a link to reset your password.
					</p>
				</div>

				<Card className='bg-white border border-gray-200 shadow-sm'>
					<CardHeader className='bg-white'>
						<CardTitle className='text-gray-900'>Reset Password</CardTitle>
						<CardDescription className='text-gray-600'>Enter your email to receive a reset link</CardDescription>
					</CardHeader>
					<CardContent className='bg-white'>
						<form onSubmit={handleSubmit} className='space-y-6'>
							{error && <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm'>{error}</div>}
							{message && <div className='bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm'>{message}</div>}

							<div className='space-y-2'>
								<Label htmlFor='email' className='text-gray-700'>
									Email address
								</Label>
								<Input
									id='email'
									name='email'
									type='email'
									autoComplete='email'
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder='Enter your email'
									className='bg-white border-gray-300 text-gray-900 placeholder-gray-500'
								/>
							</div>

							<Button type='submit' className='w-full bg-blue-600 hover:bg-blue-700 text-white' disabled={isLoading}>
								{isLoading ? (
									<>
										<Loader2 className='h-4 w-4 animate-spin mr-2' />
										Sending reset link...
									</>
								) : (
									'Send reset link'
								)}
							</Button>
						</form>

						<div className='mt-6'>
							<Link href='/login'>
								<Button variant='ghost' className='w-full'>
									<ArrowLeft className='h-4 w-4 mr-2' />
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